"""Unit tests for BalancingManager per BR-4."""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from custom_components.oig_cloud.planning.balancing_manager import (
    BalancingManager,
    BalancingConfig,
    OPPORTUNISTIC_THRESHOLD_SOC,
    ECONOMIC_CHECK_INTERVAL_HOURS,
)
from custom_components.oig_cloud.planning.plan_manager import PlanManager, PlanType
from custom_components.oig_cloud.const import HOME_III


@pytest.fixture
def mock_hass():
    """Create mock Home Assistant instance."""
    hass = MagicMock()
    hass.states = MagicMock()
    hass.services = MagicMock()
    return hass


@pytest.fixture
def mock_plan_manager():
    """Create mock PlanManager."""
    manager = MagicMock(spec=PlanManager)
    manager.box_id = "2206237016"
    manager.create_balancing_plan = MagicMock()
    manager.activate_plan = MagicMock()
    return manager


@pytest.fixture
def balancing_config():
    """Create default balancing configuration."""
    return BalancingConfig(
        enabled=True,
        opportunistic_enabled=True,
        economic_enabled=True,
        forced_enabled=True,
        holding_mode=HOME_III,
    )


@pytest.fixture
def balancing_manager(mock_hass, mock_plan_manager, balancing_config):
    """Create BalancingManager instance."""
    return BalancingManager(
        hass=mock_hass,
        plan_manager=mock_plan_manager,
        config=balancing_config,
    )


class TestBalancingConfig:
    """Test balancing configuration validation."""
    
    def test_valid_config(self):
        """Test valid configuration passes validation."""
        config = BalancingConfig(
            opportunistic_threshold_soc=95.0,
            opportunistic_min_hold_hours=6,
        )
        config.validate()  # Should not raise
    
    def test_invalid_threshold_too_low(self):
        """Test that threshold below 90% raises error."""
        config = BalancingConfig(opportunistic_threshold_soc=85.0)
        with pytest.raises(ValueError, match="opportunistic_threshold_soc"):
            config.validate()
    
    def test_invalid_threshold_too_high(self):
        """Test that threshold above 100% raises error."""
        config = BalancingConfig(opportunistic_threshold_soc=105.0)
        with pytest.raises(ValueError, match="opportunistic_threshold_soc"):
            config.validate()
    
    def test_invalid_min_hold_hours(self):
        """Test that min_hold_hours < 1 raises error."""
        config = BalancingConfig(opportunistic_min_hold_hours=0)
        with pytest.raises(ValueError, match="opportunistic_min_hold_hours"):
            config.validate()


class TestOpportunisticBalancing:
    """Test opportunistic balancing per BR-4.2."""
    
    @pytest.mark.asyncio
    async def test_triggers_on_high_soc(self, balancing_manager, mock_hass, mock_plan_manager):
        """Test that opportunistic balancing triggers when SoC >= threshold."""
        # Mock current SoC above threshold
        balancing_manager._get_current_soc_percent = AsyncMock(return_value=99.0)
        
        # Mock holding window detection
        holding_window = (datetime(2024, 11, 2, 12, 0), 6)  # 6 hours
        balancing_manager._detect_holding_window = AsyncMock(return_value=holding_window)
        
        # Mock plan creation
        mock_plan = MagicMock()
        mock_plan.plan_id = "balancing_opportunistic_123"
        mock_plan_manager.create_balancing_plan.return_value = mock_plan
        
        # Trigger check
        plan_id = await balancing_manager.check_opportunistic_balancing()
        
        # Verify plan created
        assert plan_id == "balancing_opportunistic_123"
        mock_plan_manager.create_balancing_plan.assert_called_once()
        
        # Verify parameters
        call_args = mock_plan_manager.create_balancing_plan.call_args[1]
        assert call_args["target_soc_percent"] == 100.0
        assert call_args["holding_hours"] == 6
        assert call_args["holding_mode"] == HOME_III
        assert call_args["balancing_mode"] == "opportunistic"
    
    @pytest.mark.asyncio
    async def test_does_not_trigger_on_low_soc(self, balancing_manager):
        """Test that opportunistic balancing does NOT trigger when SoC < threshold."""
        # Mock current SoC below threshold
        balancing_manager._get_current_soc_percent = AsyncMock(return_value=95.0)
        
        # Trigger check
        plan_id = await balancing_manager.check_opportunistic_balancing()
        
        # Should not create plan
        assert plan_id is None
    
    @pytest.mark.asyncio
    async def test_disabled_config(self, balancing_manager):
        """Test that disabled config prevents triggering."""
        balancing_manager.config.opportunistic_enabled = False
        
        # Mock high SoC
        balancing_manager._get_current_soc_percent = AsyncMock(return_value=99.0)
        
        # Trigger check
        plan_id = await balancing_manager.check_opportunistic_balancing()
        
        # Should not create plan
        assert plan_id is None


class TestEconomicBalancing:
    """Test economic balancing per BR-4.3 and BR-4.5."""
    
    @pytest.mark.asyncio
    async def test_iterative_mediana_validation_pass(self, balancing_manager):
        """Test iterative mediána validation - all intervals pass."""
        window_start = datetime(2024, 11, 2, 10, 0)
        window_end = datetime(2024, 11, 2, 14, 0)  # 4 hours
        window_prices = [3.0, 3.5, 3.2, 3.8]  # All high prices
        
        # Mock spot prices with mediána = 2.0
        all_prices = {}
        for h in range(48):
            ts = window_start + timedelta(hours=h - 10)
            all_prices[ts] = 1.5 if h < 24 else 2.5  # Half low, half high
        
        # Add window prices (above mediána)
        current = window_start
        for _ in range(4):
            all_prices[current] = 3.0
            current += timedelta(hours=1)
        
        balancing_manager._get_spot_prices = AsyncMock(return_value=all_prices)
        
        # Validate
        is_valid = await balancing_manager._validate_mediana_iterative(
            window_start, window_end, window_prices
        )
        
        # All intervals above mediána → should pass
        assert is_valid is True
    
    @pytest.mark.asyncio
    async def test_iterative_mediana_validation_fail(self, balancing_manager):
        """Test iterative mediána validation - one interval fails."""
        window_start = datetime(2024, 11, 2, 10, 0)
        window_end = datetime(2024, 11, 2, 14, 0)
        window_prices = [3.0, 3.5, 1.5, 3.8]  # One low price
        
        # Mock spot prices
        all_prices = {}
        for h in range(48):
            ts = window_start + timedelta(hours=h - 10)
            all_prices[ts] = 2.0  # Mediána will be 2.0
        
        # Add window with one low price
        current = window_start
        for i in range(16):  # 4h * 4 intervals
            price = 3.0 if i != 8 else 1.5  # One interval below mediána
            all_prices[current] = price
            current += timedelta(minutes=15)
        
        balancing_manager._get_spot_prices = AsyncMock(return_value=all_prices)
        
        # Validate
        is_valid = await balancing_manager._validate_mediana_iterative(
            window_start, window_end, window_prices
        )
        
        # One interval below mediána → should fail
        assert is_valid is False
    
    @pytest.mark.asyncio
    async def test_economic_check_interval(self, balancing_manager):
        """Test that economic check respects check interval."""
        # Set last check to 30 minutes ago
        balancing_manager._last_economic_check = datetime.now() - timedelta(minutes=30)
        balancing_manager.config.economic_check_interval_hours = 1  # 1 hour interval
        
        # Mock methods
        balancing_manager._get_export_window = AsyncMock(return_value=None)
        
        # Trigger check
        plan_id = await balancing_manager.check_economic_balancing()
        
        # Should not check (too soon)
        assert plan_id is None
        balancing_manager._get_export_window.assert_not_called()


class TestForcedBalancing:
    """Test forced balancing per BR-4.6."""
    
    @pytest.mark.asyncio
    async def test_triggers_after_30_days(self, balancing_manager, mock_plan_manager):
        """Test that forced balancing triggers after 30 days."""
        # Set last forced balancing to 31 days ago
        balancing_manager._last_forced_balancing = datetime.now() - timedelta(days=31)
        
        # Mock cheap window
        cheap_window = (datetime(2024, 11, 2, 3, 0), 6)
        balancing_manager._find_cheap_window = AsyncMock(return_value=cheap_window)
        
        # Mock plan creation
        mock_plan = MagicMock()
        mock_plan.plan_id = "balancing_forced_123"
        mock_plan_manager.create_balancing_plan.return_value = mock_plan
        
        # Trigger check
        plan_id = await balancing_manager.check_forced_balancing()
        
        # Should create plan
        assert plan_id == "balancing_forced_123"
        mock_plan_manager.create_balancing_plan.assert_called_once()
        
        # Verify mode
        call_args = mock_plan_manager.create_balancing_plan.call_args[1]
        assert call_args["balancing_mode"] == "forced"
    
    @pytest.mark.asyncio
    async def test_does_not_trigger_too_soon(self, balancing_manager):
        """Test that forced balancing does NOT trigger before 30 days."""
        # Set last forced balancing to 10 days ago
        balancing_manager._last_forced_balancing = datetime.now() - timedelta(days=10)
        balancing_manager.config.forced_interval_days = 30
        
        # Trigger check
        plan_id = await balancing_manager.check_forced_balancing()
        
        # Should not create plan
        assert plan_id is None


class TestExplicitHoldingParameters:
    """Test explicit holding parameters per BR-4.4."""
    
    @pytest.mark.asyncio
    async def test_holding_parameters_in_plan(self, balancing_manager, mock_plan_manager):
        """Test that all holding parameters are explicitly passed."""
        # Mock high SoC
        balancing_manager._get_current_soc_percent = AsyncMock(return_value=99.0)
        
        # Mock holding window
        target_time = datetime(2024, 11, 2, 12, 0)
        holding_window = (target_time, 8)  # 8 hours
        balancing_manager._detect_holding_window = AsyncMock(return_value=holding_window)
        
        # Mock plan
        mock_plan = MagicMock()
        mock_plan.plan_id = "test_plan"
        mock_plan_manager.create_balancing_plan.return_value = mock_plan
        
        # Trigger
        await balancing_manager.check_opportunistic_balancing()
        
        # Verify ALL holding parameters present
        call_args = mock_plan_manager.create_balancing_plan.call_args[1]
        assert "target_soc_percent" in call_args
        assert "target_time" in call_args
        assert "holding_hours" in call_args
        assert "holding_mode" in call_args
        
        # Verify values
        assert call_args["target_soc_percent"] == 100.0
        assert call_args["target_time"] == target_time
        assert call_args["holding_hours"] == 8
        assert call_args["holding_mode"] == HOME_III


class TestHoldingWindowDetection:
    """Test holding window detection per BR-4.2."""
    
    @pytest.mark.asyncio
    async def test_detect_valid_window(self, balancing_manager):
        """Test detection of valid holding window from history."""
        # Mock history with continuous high SoC
        history = [
            (datetime(2024, 11, 2, 10, 0), 98.5),
            (datetime(2024, 11, 2, 11, 0), 99.0),
            (datetime(2024, 11, 2, 12, 0), 98.8),
            (datetime(2024, 11, 2, 13, 0), 99.2),
            (datetime(2024, 11, 2, 14, 0), 98.6),
            (datetime(2024, 11, 2, 15, 0), 99.0),
        ]
        balancing_manager._get_soc_history = AsyncMock(return_value=history)
        balancing_manager.config.opportunistic_min_hold_hours = 4
        
        # Detect window
        window = await balancing_manager._detect_holding_window()
        
        # Should find window
        assert window is not None
        target_time, holding_hours = window
        assert holding_hours >= 4
    
    @pytest.mark.asyncio
    async def test_no_window_if_too_short(self, balancing_manager):
        """Test that short high SoC periods don't trigger."""
        # Mock history with short high SoC
        history = [
            (datetime(2024, 11, 2, 10, 0), 98.5),
            (datetime(2024, 11, 2, 11, 0), 99.0),
            (datetime(2024, 11, 2, 12, 0), 95.0),  # Drops
        ]
        balancing_manager._get_soc_history = AsyncMock(return_value=history)
        balancing_manager.config.opportunistic_min_hold_hours = 4
        
        # Detect window
        window = await balancing_manager._detect_holding_window()
        
        # Should not find window (too short)
        assert window is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
