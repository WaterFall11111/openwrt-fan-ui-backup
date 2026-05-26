#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <router_ip> [router_user]"
  exit 1
fi

ROUTER_IP="$1"
ROUTER_USER="${2:-root}"
RSH="ssh ${ROUTER_USER}@${ROUTER_IP}"

echo "== File checks =="
$RSH "ls -l /www/luci-static/resources/view/system/fan_control.js /usr/bin/fan-control-rpc /usr/share/luci/menu.d/zz-fancontrol-override.json /usr/share/rpcd/acl.d/luci-app-fan-control.json"

echo
echo "== RPC status =="
$RSH "/usr/bin/fan-control-rpc status || true"

echo
echo "== Auto/manual mode smoke test =="
$RSH "/usr/bin/fan-control-rpc apply_auto >/dev/null && echo 'auto: ok' || echo 'auto: fail'"
$RSH "/usr/bin/fan-control-rpc apply_manual 120 >/dev/null && echo 'manual 120: ok' || echo 'manual 120: fail'"
$RSH "/usr/bin/fan-control-rpc preset balanced >/dev/null && echo 'preset balanced: ok' || echo 'preset balanced: fail'"
$RSH "/usr/bin/fan-control-rpc apply_auto >/dev/null && echo 'auto restore: ok' || echo 'auto restore: fail'"

echo
echo "== UCI mode flag =="
$RSH "uci -q get fancontrol.main.manual_mode; uci -q get fancontrol.main.fan_pwm_file; uci -q get fancontrol.main.thermal_file"

echo
echo "Self-test completed."

