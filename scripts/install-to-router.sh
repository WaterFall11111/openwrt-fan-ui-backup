#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <router_ip> [router_user]"
  exit 1
fi

ROUTER_IP="$1"
ROUTER_USER="${2:-root}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "$BASE_DIR"

echo "[1/4] Upload package content to router..."
tar -czf - htdocs root | ssh "${ROUTER_USER}@${ROUTER_IP}" "mkdir -p /tmp/fan-ui && tar -xzf - -C /tmp/fan-ui"

echo "[2/4] Install files..."
ssh "${ROUTER_USER}@${ROUTER_IP}" "
set -e
mkdir -p /www/luci-static/resources/view/system /root/fan-ui-backup
cp -f /etc/config/fancontrol /root/fan-ui-backup/fancontrol.\$(date +%F-%H%M%S) 2>/dev/null || true
cp -f /tmp/fan-ui/htdocs/luci-static/resources/view/system/fan_control.js /www/luci-static/resources/view/system/fan_control.js
cp -f /tmp/fan-ui/root/usr/bin/fan-control-rpc /usr/bin/fan-control-rpc
chmod +x /usr/bin/fan-control-rpc
cp -f /tmp/fan-ui/root/etc/config/fancontrol /etc/config/fancontrol
cp -f /tmp/fan-ui/root/usr/share/rpcd/acl.d/luci-app-fan-control.json /usr/share/rpcd/acl.d/luci-app-fan-control.json
cp -f /tmp/fan-ui/root/usr/share/luci/menu.d/zz-fancontrol-override.json /usr/share/luci/menu.d/zz-fancontrol-override.json
rm -f /usr/share/luci/menu.d/luci-app-fan-control.json
"

echo "[3/4] Restart LuCI services..."
ssh "${ROUTER_USER}@${ROUTER_IP}" "/etc/init.d/rpcd restart; /etc/init.d/uhttpd restart; rm -f /tmp/luci-indexcache /tmp/luci-modulecache/*"

echo "[4/4] Done."
echo "Open: http://${ROUTER_IP}/cgi-bin/luci/admin/services/fancontrol"

