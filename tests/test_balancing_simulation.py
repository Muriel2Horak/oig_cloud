"""
Test simulace balancing scénářů.

Testujeme:
1. Interval balancing (7. den od posledního balancingu)
2. Opportunistic balancing (levné ceny, vysoké SoC)
3. Normální provoz bez balancingu
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List
from zoneinfo import ZoneInfo

import pytest

from custom_components.oig_cloud.battery_forecast.optimizer.hybrid import (
    HybridOptimizer,
)
from custom_components.oig_cloud.battery_forecast.types import (
    CBB_MODE_HOME_I,
    CBB_MODE_HOME_UPS,
    get_mode_name,
)

TZ = ZoneInfo("Europe/Prague")


def create_spot_prices(
    start: datetime,
    n_intervals: int = 96,
    base_price: float = 3.5,
    cheap_hours: List[int] = None,
    expensive_hours: List[int] = None,
) -> List[Dict[str, Any]]:
    """Vytvoří spot ceny pro simulaci."""
    if cheap_hours is None:
        cheap_hours = [2, 3, 4, 5, 14, 15]
    if expensive_hours is None:
        expensive_hours = [7, 8, 18, 19, 20]

    prices = []
    for i in range(n_intervals):
        ts = start + timedelta(minutes=i * 15)
        hour = ts.hour

        if hour in cheap_hours:
            price = base_price * 0.5
        elif hour in expensive_hours:
            price = base_price * 1.8
        else:
            price = base_price + (i % 5) * 0.1

        prices.append({"time": ts.isoformat(), "price": price})

    return prices


def create_solar_forecast(n_intervals: int = 96) -> List[float]:
    """Vytvoří solární předpověď (typický zimní den)."""
    solar = []
    for i in range(n_intervals):
        hour = (i * 15) // 60
        if 8 <= hour <= 16:
            peak_hour = 12
            solar_kwh = 0.8 * max(0, 1 - ((hour - peak_hour) / 4) ** 2)
        else:
            solar_kwh = 0.0
        solar.append(solar_kwh)
    return solar


def create_load_forecast(n_intervals: int = 96) -> List[float]:
    """Vytvoří předpověď spotřeby."""
    load = []
    for i in range(n_intervals):
        hour = (i * 15) // 60
        if 6 <= hour <= 8 or 17 <= hour <= 22:
            load_kwh = 0.4
        elif 0 <= hour <= 5:
            load_kwh = 0.15
        else:
            load_kwh = 0.25
        load.append(load_kwh)
    return load


def print_result_summary(
    result: Dict[str, Any],
    spot_prices: List[Dict[str, Any]],
    title: str,
) -> None:
    """Vytiskne souhrn výsledku."""
    modes = result["modes"]
    n = len(modes)

    print(f"\n{'=' * 60}")
    print(f"📊 {title}")
    print(f"{'=' * 60}")

    print("\n📈 Souhrn:")
    print(f"   Celková cena: {result.get('total_cost_czk', 0):.2f} Kč")
    print(f"   Baseline cena: {result.get('baseline_cost_czk', 0):.2f} Kč")
    savings = result.get("baseline_cost_czk", 0) - result.get("total_cost_czk", 0)
    print(f"   Úspory: {savings:.2f} Kč")
    print(f"   Finální baterie: {result.get('final_battery_kwh', 0):.2f} kWh")

    print("\n📋 Distribuce módů:")
    dist = result.get("modes_distribution", {})
    for mode_name, count in dist.items():
        pct = count / n * 100 if n > 0 else 0
        print(f"   {mode_name}: {count} ({pct:.1f}%)")

    if result.get("is_balancing_mode"):
        print("\n🔋 BALANCING AKTIVNÍ:")
        print(f"   Deadline: {result.get('balancing_deadline', 'N/A')}")
        print(f"   Holding start: {result.get('balancing_holding_start', 'N/A')}")
        print(f"   Holding end: {result.get('balancing_holding_end', 'N/A')}")

    # UPS intervaly
    ups_intervals = [i for i, m in enumerate(modes) if m == CBB_MODE_HOME_UPS]
    if ups_intervals:
        print(f"\n⚡ UPS intervaly ({len(ups_intervals)}):")
        # Seskupíme po hodinách
        ups_hours = {}
        for idx in ups_intervals:
            ts = datetime.fromisoformat(spot_prices[idx]["time"])
            hour = ts.hour
            ups_hours[hour] = ups_hours.get(hour, 0) + 1
        for hour, count in sorted(ups_hours.items()):
            print(f"   {hour:02d}:00 - {count} intervalů")


class TestBalancingSimulation:
    """Testy pro simulaci balancing scénářů."""

    @pytest.fixture
    def optimizer(self) -> HybridOptimizer:
        """Vytvoří optimizer s typickými parametry."""
        return HybridOptimizer(
            max_capacity=15.36,
            min_capacity=3.07,
            target_capacity=12.0,
            charge_rate_kw=2.8,
            efficiency=0.88,
        )

    def test_interval_balancing_7th_day(self, optimizer: HybridOptimizer) -> None:
        """
        SCÉNÁŘ 1: Interval Balancing (7. den)

        Situace: Je 7. den od posledního balancingu, SoC=45%, musíme nabít na 100%
        Očekávání:
        - is_balancing_mode = True
        - Více UPS intervalů (nabíjení)
        - Baterie na konci blízko max_capacity
        """
        print("\n" + "=" * 60)
        print("🔋 SCÉNÁŘ 1: Interval Balancing (7. den)")
        print("=" * 60)
        print("Situace: 7. den od balancingu, SoC=45%, musí nabít na 100%")

        now = datetime.now(TZ).replace(hour=10, minute=0, second=0, microsecond=0)

        spot_prices = create_spot_prices(now)
        solar = create_solar_forecast()
        load = create_load_forecast()

        holding_start = now.replace(hour=21, minute=0)
        holding_end = now.replace(hour=23, minute=59)

        balancing_plan = {
            "reason": "interval",
            "holding_start": holding_start.isoformat(),
            "holding_end": holding_end.isoformat(),
            "charging_intervals": [],
        }

        print(f"\nBalancing plán:")
        print(
            f"  Holding: {holding_start.strftime('%H:%M')} - {holding_end.strftime('%H:%M')}"
        )
        print(f"  Deadline: {holding_start.strftime('%H:%M')}")

        result = optimizer.optimize(
            current_capacity=6.9,  # ~45% SoC
            spot_prices=spot_prices,
            solar_forecast=solar,
            load_forecast=load,
            balancing_plan=balancing_plan,
        )

        print_result_summary(result, spot_prices, "Interval Balancing")

        # Assertions
        assert result["is_balancing_mode"] is True, "Měl by být v balancing módu"
        assert (
            result["ups_intervals_count"] > 10
        ), "Mělo by být mnoho UPS intervalů pro nabíjení"

        # Spočítáme UPS intervaly v holding period (21:00-24:00)
        modes = result["modes"]
        holding_ups = sum(
            1
            for i, m in enumerate(modes)
            if m == CBB_MODE_HOME_UPS and i >= 44 and i < 56  # 21:00-23:45
        )
        assert (
            holding_ups > 0
        ), f"Měly by být UPS intervaly v holding period, ale je {holding_ups}"

    def test_opportunistic_balancing(self, optimizer: HybridOptimizer) -> None:
        """
        SCÉNÁŘ 2: Opportunistic Balancing

        Situace: SoC=85%, velmi levné ceny nadcházející noc - dobrá příležitost
        Očekávání:
        - is_balancing_mode = True
        - UPS preferovaně v levných hodinách
        """
        print("\n" + "=" * 60)
        print("💰 SCÉNÁŘ 2: Opportunistic Balancing")
        print("=" * 60)
        print("Situace: SoC=85%, velmi levné ceny v noci")

        now = datetime.now(TZ).replace(hour=18, minute=0, second=0, microsecond=0)

        spot_prices = create_spot_prices(
            now,
            cheap_hours=[22, 23, 0, 1, 2, 3, 4],
            expensive_hours=[7, 8, 9, 17, 18, 19],
        )
        solar = create_solar_forecast()
        load = create_load_forecast()

        holding_start = now.replace(hour=23, minute=0)
        holding_end = (now + timedelta(days=1)).replace(hour=2, minute=0)

        # Preferované levné intervaly
        preferred = []
        for h in [22, 23]:
            for q in range(4):
                ts = now.replace(hour=h, minute=q * 15)
                preferred.append({"timestamp": ts.isoformat()})

        balancing_plan = {
            "reason": "opportunistic",
            "holding_start": holding_start.isoformat(),
            "holding_end": holding_end.isoformat(),
            "charging_intervals": preferred,
        }

        print(f"\nBalancing plán:")
        print(f"  Důvod: Opportunistic (levné ceny)")
        print(f"  Holding: {holding_start.strftime('%H:%M')} - 02:00")
        print(f"  Preferované intervaly: {len(preferred)}")

        result = optimizer.optimize(
            current_capacity=13.06,  # ~85% SoC
            spot_prices=spot_prices,
            solar_forecast=solar,
            load_forecast=load,
            balancing_plan=balancing_plan,
        )

        print_result_summary(result, spot_prices, "Opportunistic Balancing")

        assert result["is_balancing_mode"] is True

    def test_normal_operation_no_balancing(self, optimizer: HybridOptimizer) -> None:
        """
        SCÉNÁŘ 3: Normální provoz bez balancingu

        Situace: 3. den od balancingu, SoC=50%, normální optimalizace
        Očekávání:
        - is_balancing_mode = False
        - Méně UPS intervalů (jen pro arbitráž)
        """
        print("\n" + "=" * 60)
        print("🏠 SCÉNÁŘ 3: Normální provoz (bez balancingu)")
        print("=" * 60)
        print("Situace: 3. den, SoC=50%, normální optimalizace")

        now = datetime.now(TZ).replace(hour=10, minute=0, second=0, microsecond=0)

        spot_prices = create_spot_prices(now)
        solar = create_solar_forecast()
        load = create_load_forecast()

        result = optimizer.optimize(
            current_capacity=7.68,  # 50% SoC
            spot_prices=spot_prices,
            solar_forecast=solar,
            load_forecast=load,
            balancing_plan=None,
        )

        print_result_summary(result, spot_prices, "Normální provoz")

        assert result["is_balancing_mode"] is False
        # V normálním režimu by mělo být méně UPS intervalů
        assert result["ups_intervals_count"] < 30, "Normální provoz nemá tolik UPS"

    def test_compare_balancing_vs_normal(self, optimizer: HybridOptimizer) -> None:
        """
        Porovnání: Stejné podmínky, s balancing vs bez.
        """
        print("\n" + "=" * 60)
        print("⚖️  POROVNÁNÍ: Balancing vs Normální provoz")
        print("=" * 60)

        now = datetime.now(TZ).replace(hour=10, minute=0, second=0, microsecond=0)

        spot_prices = create_spot_prices(now)
        solar = create_solar_forecast()
        load = create_load_forecast()

        # Bez balancingu
        result_normal = optimizer.optimize(
            current_capacity=7.68,
            spot_prices=spot_prices,
            solar_forecast=solar,
            load_forecast=load,
            balancing_plan=None,
        )

        # S balancingem
        holding_start = now.replace(hour=21, minute=0)
        holding_end = now.replace(hour=23, minute=59)

        result_balancing = optimizer.optimize(
            current_capacity=7.68,
            spot_prices=spot_prices,
            solar_forecast=solar,
            load_forecast=load,
            balancing_plan={
                "reason": "interval",
                "holding_start": holding_start.isoformat(),
                "holding_end": holding_end.isoformat(),
                "charging_intervals": [],
            },
        )

        print(f"\n{'Metrika':<25} {'Normální':>12} {'Balancing':>12} {'Rozdíl':>12}")
        print("-" * 65)

        cost_n = result_normal.get("total_cost_czk", 0)
        cost_b = result_balancing.get("total_cost_czk", 0)
        print(
            f"{'Celková cena (Kč)':<25} {cost_n:>12.2f} {cost_b:>12.2f} {cost_b - cost_n:>+12.2f}"
        )

        ups_n = result_normal.get("ups_intervals_count", 0)
        ups_b = result_balancing.get("ups_intervals_count", 0)
        print(f"{'UPS intervaly':<25} {ups_n:>12} {ups_b:>12} {ups_b - ups_n:>+12}")

        bat_n = result_normal.get("final_battery_kwh", 0)
        bat_b = result_balancing.get("final_battery_kwh", 0)
        print(
            f"{'Finální baterie (kWh)':<25} {bat_n:>12.2f} {bat_b:>12.2f} {bat_b - bat_n:>+12.2f}"
        )

        print(f"\n💡 Balancing navíc stojí: {cost_b - cost_n:.2f} Kč")
        print("   Ale zajistí vyrovnání článků baterie")

        # V balancing mode je cílem dosáhnout 100% před deadline, ne držet ji na konci
        # Assertion změněna - balancing by měl mít více UPS intervalů
        assert ups_b > ups_n, "Balancing by měl mít více UPS intervalů"

    def test_balancing_deadline_reached(self, optimizer: HybridOptimizer) -> None:
        """
        Test že baterie dosáhne 100% před deadline.
        """
        print("\n" + "=" * 60)
        print("🎯 TEST: Dosažení 100% před deadline")
        print("=" * 60)

        now = datetime.now(TZ).replace(hour=8, minute=0, second=0, microsecond=0)

        spot_prices = create_spot_prices(now)
        solar = create_solar_forecast()
        load = create_load_forecast()

        holding_start = now.replace(hour=18, minute=0)  # Deadline v 18:00
        holding_end = now.replace(hour=21, minute=0)

        result = optimizer.optimize(
            current_capacity=5.0,  # ~33% SoC - nízká
            spot_prices=spot_prices,
            solar_forecast=solar,
            load_forecast=load,
            balancing_plan={
                "reason": "interval",
                "holding_start": holding_start.isoformat(),
                "holding_end": holding_end.isoformat(),
                "charging_intervals": [],
            },
        )

        print_result_summary(result, spot_prices, "Deadline Test")

        assert result["is_balancing_mode"] is True

        # Spočítáme UPS intervaly před deadline (8:00-18:00 = 40 intervalů)
        modes = result["modes"]
        ups_before_deadline = sum(
            1 for i, m in enumerate(modes) if m == CBB_MODE_HOME_UPS and i < 40
        )

        print(f"\nUPS před deadline: {ups_before_deadline}")

        # Potřebujeme nabít ~10 kWh, při 0.7 kWh/interval potřebujeme ~15 intervalů
        assert (
            ups_before_deadline >= 10
        ), f"Mělo by být alespoň 10 UPS před deadline, je {ups_before_deadline}"


if __name__ == "__main__":
    # Spuštění s verbose výstupem
    pytest.main([__file__, "-v", "-s", "--tb=short"])
