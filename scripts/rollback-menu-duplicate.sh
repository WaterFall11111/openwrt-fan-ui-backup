#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <router_ip> [router_user]"
  exit 1
fi

ROUTER_IP="$1"
ROUTER_USER="${2:-root}"

ssh "${ROUTER_USER}@${ROUTER_IP}" "
rm -f /usr/share/luci/menu.d/luci-app-fan-control.json
/etc/init.d/rpcd restart
/etc/init.d/uhttpd restart
rm -f /tmp/luci-indexcache /tmp/luci-modulecache/*
echo 'Menu duplicate removed'
"

