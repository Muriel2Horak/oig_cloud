#!/bin/bash

# 🚀 OIG Cloud Dashboard Switcher - Deployment Script
# Automatické nasazení nového dashboard systému s přepínáním pohledů

set -e  # Exit on any error

# Barvy pro výstup
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funkce pro výstup
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                   OIG Cloud Dashboard Switcher                ║"
    echo "║                      Deployment Script                        ║"
    echo "║                         v1.0.0                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Detekce Home Assistant konfigurace
detect_ha_config() {
    print_status "Detekuji Home Assistant konfiguraci..."

    # Obvyklé cesty pro HA config
    local ha_paths=(
        "/config"
        "/usr/share/hassio/homeassistant"
        "$(pwd)"
        "$HOME/.homeassistant"
        "/opt/homeassistant"
    )

    for path in "${ha_paths[@]}"; do
        if [[ -f "$path/configuration.yaml" ]]; then
            HA_CONFIG_DIR="$path"
            print_success "Nalezen Home Assistant v: $HA_CONFIG_DIR"
            return 0
        fi
    done

    print_error "Home Assistant konfigurace nenalezena!"
    read -p "Zadejte cestu k Home Assistant config složce: " HA_CONFIG_DIR

    if [[ ! -f "$HA_CONFIG_DIR/configuration.yaml" ]]; then
        print_error "Neplatná cesta k Home Assistant!"
        exit 1
    fi
}

# Kontrola OIG Cloud integrace
check_oig_integration() {
    print_status "Kontroluji OIG Cloud integraci..."

    OIG_WWW_DIR="$HA_CONFIG_DIR/custom_components/oig_cloud/www"

    if [[ ! -d "$OIG_WWW_DIR" ]]; then
        print_error "OIG Cloud integrace nenalezena v: $OIG_WWW_DIR"
        print_error "Nejprve nainstalujte OIG Cloud integraci přes HACS!"
        exit 1
    fi

    if [[ ! -f "$OIG_WWW_DIR/dashboard.html" ]]; then
        print_error "Základní dashboard soubory nenalezeny!"
        print_error "Přeinstalujte OIG Cloud integraci."
        exit 1
    fi

    print_success "OIG Cloud integrace nalezena"
}

# Záloha stávajících souborů
backup_existing_files() {
    print_status "Vytvářím zálohu stávajících souborů..."

    BACKUP_DIR="$OIG_WWW_DIR/backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    # Zálohovat soubory, které budou upraveny
    local files_to_backup=(
        "dashboard.html"
        "dashboard.js"
    )

    for file in "${files_to_backup[@]}"; do
        if [[ -f "$OIG_WWW_DIR/$file" ]]; then
            cp "$OIG_WWW_DIR/$file" "$BACKUP_DIR/"
            print_status "Zálohován: $file"
        fi
    done

    print_success "Záloha vytvořena v: $BACKUP_DIR"
}

# Nasazení nových souborů
deploy_new_files() {
    print_status "Nasazuji nové soubory dashboard switcheru..."

    # Zkontrolovat že jsme ve správné složce
    if [[ ! -f "./custom_components/oig_cloud/www/dashboard-switcher.js" ]]; then
        print_error "Nenalezen zdrojový soubor dashboard-switcher.js"
        print_error "Spusťte skript ze složky s OIG Cloud projektem!"
        exit 1
    fi

    # Zkopírovat nové soubory
    local files_to_deploy=(
        "dashboard-switcher.js:dashboard-switcher.js"
        "dashboard-styles.css:dashboard-styles.css"
    )

    for mapping in "${files_to_deploy[@]}"; do
        source_file="${mapping%%:*}"
        target_file="${mapping##*:}"

        if [[ -f "./custom_components/oig_cloud/www/$source_file" ]]; then
            cp "./custom_components/oig_cloud/www/$source_file" "$OIG_WWW_DIR/$target_file"
            print_success "Nasazen: $target_file"
        else
            print_error "Zdrojový soubor nenalezen: $source_file"
            exit 1
        fi
    done
}

# Aktualizace dashboard.html
update_dashboard_html() {
    print_status "Aktualizuji dashboard.html..."

    local dashboard_file="$OIG_WWW_DIR/dashboard.html"

    # Kontrola že soubor existuje
    if [[ ! -f "$dashboard_file" ]]; then
        print_error "dashboard.html nenalezen!"
        exit 1
    fi

    # Zkontrolovat zda už není aktualizován
    if grep -q "dashboard-switcher.js" "$dashboard_file"; then
        print_warning "dashboard.html už obsahuje switcher - přeskakuji aktualizaci"
        return 0
    fi

    # Vytvořit dočasný soubor s aktualizací
    local temp_file=$(mktemp)

    # Přidat switcher script a CSS
    sed '/chart-loader\.js/a\    <script src="/oig_cloud_static/dashboard-switcher.js"></script>\n    <link rel="stylesheet" href="/oig_cloud_static/dashboard-styles.css">' "$dashboard_file" > "$temp_file"

    # Aktualizovat body strukturu pro switcher
    sed -i.bak 's/<div class="dashboard-container">/<div class="header-container">\n        <!-- Dashboard switcher tabs se vloží zde -->\n    <\/div>\n\n    <div class="dashboard-container">/' "$temp_file"

    # Nahradit původní soubor
    mv "$temp_file" "$dashboard_file"
    rm -f "${dashboard_file}.bak"

    print_success "dashboard.html aktualizován"
}

# Nasazení dokumentace
deploy_documentation() {
    print_status "Nasazuji dokumentaci..."

    local docs_dir="$HA_CONFIG_DIR/custom_components/oig_cloud/docs"
    mkdir -p "$docs_dir"

    local doc_files=(
        "DASHBOARD_SWITCHER_QUICKSTART.md"
        "DASHBOARD_SWITCHER_TECH.md"
        "DASHBOARDS_README.md"
    )

    for doc_file in "${doc_files[@]}"; do
        if [[ -f "./docs/$doc_file" ]]; then
            cp "./docs/$doc_file" "$docs_dir/"
            print_success "Dokumentace: $doc_file"
        fi
    done
}

# Kontrola syntaxe JavaScript souborů
validate_js_files() {
    print_status "Kontroluji syntaxi JavaScript souborů..."

    # Pokud je dostupný node.js, použij ho pro validaci
    if command -v node >/dev/null 2>&1; then
        for js_file in "$OIG_WWW_DIR"/*.js; do
            if [[ -f "$js_file" ]]; then
                if ! node -c "$js_file" 2>/dev/null; then
                    print_error "Syntax chyba v: $(basename "$js_file")"
                    exit 1
                fi
            fi
        done
        print_success "JavaScript syntaxe v pořádku"
    else
        print_warning "Node.js nedostupný - přeskakuji validaci JS syntaxe"
    fi
}

# Restart Home Assistant
restart_home_assistant() {
    print_status "Restartuji Home Assistant..."

    # Různé způsoby restartu podle instalace
    local restart_methods=(
        "ha core restart"  # Home Assistant OS
        "systemctl restart home-assistant@homeassistant"  # systemd
        "supervisorctl restart homeassistant"  # supervisor
        "docker restart homeassistant"  # Docker s názvem homeassistant
    )

    for method in "${restart_methods[@]}"; do
        if command -v ${method%% *} >/dev/null 2>&1; then
            print_status "Restartuji pomocí: $method"
            if $method; then
                print_success "Home Assistant restartován"
                return 0
            fi
        fi
    done

    print_warning "Automatický restart selhal"
    print_warning "Restartujte Home Assistant ručně:"
    print_warning "- Nastavení → Systém → Restart"
    print_warning "- Nebo přes CLI/SSH podle vaší instalace"
}

# Zobrazení informací o dokončení
show_completion_info() {
    print_success "Dashboard Switcher úspěšně nasazen!"
    echo
    print_status "📋 Co bylo provedeno:"
    echo "  ✅ Vytvořena záloha stávajících souborů"
    echo "  ✅ Nasazeny nové JavaScript a CSS soubory"
    echo "  ✅ Aktualizován dashboard.html"
    echo "  ✅ Přidána dokumentace"
    echo "  ✅ Validována syntaxe souborů"
    echo
    print_status "🚀 Další kroky:"
    echo "  1. Počkejte na dokončení restartu Home Assistant"
    echo "  2. Vyčistěte browser cache (Ctrl+F5)"
    echo "  3. Otevřete dashboard URL:"
    echo "     http://YOUR_HA_IP:8123/oig_cloud_dashboard?entry_id=YOUR_ENTRY&inverter_sn=YOUR_SN"
    echo "  4. Uvidíte nové tabs pro přepínání pohledů"
    echo
    print_status "📚 Dokumentace:"
    echo "  - Rychlý start: $HA_CONFIG_DIR/custom_components/oig_cloud/docs/DASHBOARD_SWITCHER_QUICKSTART.md"
    echo "  - Technické info: $HA_CONFIG_DIR/custom_components/oig_cloud/docs/DASHBOARD_SWITCHER_TECH.md"
    echo
    print_status "🔧 Řešení problémů:"
    echo "  - Tabs se nezobrazují → Vyčistěte cache a restartujte HA"
    echo "  - Chyby v konzoli → Zkontrolujte logy HA"
    echo "  - Záloha je v: $(ls -t $OIG_WWW_DIR/backup_* | head -1)"
}

# Rollback funkce
rollback_deployment() {
    print_warning "Provádím rollback nasazení..."

    local latest_backup=$(ls -t $OIG_WWW_DIR/backup_* 2>/dev/null | head -1)

    if [[ -z "$latest_backup" ]]; then
        print_error "Žádná záloha nalezena pro rollback!"
        exit 1
    fi

    # Obnovit soubory ze zálohy
    cp "$latest_backup"/* "$OIG_WWW_DIR/"

    # Smazat switcher soubory
    rm -f "$OIG_WWW_DIR/dashboard-switcher.js"
    rm -f "$OIG_WWW_DIR/dashboard-styles.css"

    print_success "Rollback dokončen - obnoveny soubory ze zálohy: $latest_backup"
}

# Hlavní funkce
main() {
    print_header

    # Parse argumenty
    case "${1:-}" in
        --rollback)
            detect_ha_config
            check_oig_integration
            rollback_deployment
            exit 0
            ;;
        --help|-h)
            echo "Použití: $0 [--rollback] [--help]"
            echo ""
            echo "Možnosti:"
            echo "  --rollback    Vrátit změny pomocí zálohy"
            echo "  --help        Zobrazit tuto nápovědu"
            exit 0
            ;;
    esac

    # Hlavní nasazení
    detect_ha_config
    check_oig_integration
    backup_existing_files
    deploy_new_files
    update_dashboard_html
    deploy_documentation
    validate_js_files

    # Nabídka restartu
    echo
    read -p "Restartovat Home Assistant nyní? (y/N): " restart_choice
    if [[ "$restart_choice" =~ ^[Yy]$ ]]; then
        restart_home_assistant
        sleep 5  # Počkat chvíli na restart
    fi

    show_completion_info
}

# Kontrola root práv (pokud potřeba)
if [[ $EUID -eq 0 ]]; then
   print_warning "Spouštíte jako root - to může způsobit problémy s oprávněními souborů"
   read -p "Pokračovat? (y/N): " continue_choice
   if [[ ! "$continue_choice" =~ ^[Yy]$ ]]; then
       exit 1
   fi
fi

# Spustit hlavní funkci
main "$@"