include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI - Fan General Control
LUCI_DEPENDS:=+luci-base +coreutils-sed +coreutils-awk
LUCI_PKGARCH:=all

PKG_LICENSE:=GPL-2.0

include ../../luci.mk

