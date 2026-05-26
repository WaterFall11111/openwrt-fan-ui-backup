'use strict';
'require view';
'require fs';
'require ui';
'require dom';

return view.extend({
	handleSaveApply: null,
	handleSave: null,
	handleReset: null,

	callRpc(args) {
		return L.resolveDefault(fs.exec_direct('/usr/bin/fan-control-rpc', args, 'text'), '{}').then(function (out) {
			try {
				return JSON.parse(out || '{}');
			} catch (e) {
				return { error: 'parse_error', raw: out || '' };
			}
		});
	},

	load() {
		return this.callRpc([ 'status' ]);
	},

	render(status) {
		var self = this;
		status = status || {};

		var css = E('style', {}, [`
			.fan-wrap { max-width: 980px; margin: 8px 0 0; }
			.fan-card {
				background: linear-gradient(180deg, #0f172a 0%, #0b1324 100%);
				border: 1px solid #1f2a44;
				border-radius: 16px;
				padding: 22px;
				box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
				color: #e5e7eb;
			}
			.fan-header { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
			.fan-logo {
				width: 56px; height: 56px; border-radius: 50%;
				background: radial-gradient(circle at 30% 30%, #06b6d4 0%, #0ea5e9 45%, #1d4ed8 100%);
				display: inline-flex; align-items: center; justify-content: center;
				color: #e0f2fe; font-size: 26px; font-weight: 800;
			}
			.fan-title { font-size: 34px; margin: 0; font-weight: 700; color: #f8fafc; }
			.fan-subtitle { margin: 2px 0 0; color: #94a3b8; font-size: 16px; }
			.fan-metrics { display: grid; grid-template-columns: repeat(2, minmax(260px, 1fr)); gap: 12px; margin-bottom: 14px; }
			.fan-metric {
				border: 1px solid #1e293b; border-radius: 12px; padding: 16px;
				background: rgba(2, 6, 23, 0.7);
			}
			.fan-metric-label { color: #93a4bf; font-size: 14px; margin-bottom: 6px; }
			.fan-metric-value { color: #f8fafc; font-size: 48px; line-height: 1.05; font-weight: 700; }
			.fan-slider-title { margin: 10px 0 8px; font-size: 22px; color: #cbd5e1; }
			.fan-slider { width: 100%; accent-color: #38bdf8; cursor: pointer; }
			.fan-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
			.fan-btn {
				border: 0; border-radius: 10px; padding: 10px 18px;
				font-size: 16px; font-weight: 700; color: #e2e8f0;
				background: #334155; cursor: pointer;
			}
			.fan-btn:disabled { opacity: 0.6; cursor: not-allowed; }
			.fan-btn-primary { background: linear-gradient(90deg, #3b82f6, #2563eb); }
			.fan-btn-danger { background: #dc2626; }
			.fan-btn-auto { background: #475569; }
			.fan-btn-refresh { background: #334155; }
			.fan-updated { margin-top: 14px; color: #22c55e; font-size: 22px; font-weight: 600; }
			.fan-message { margin-top: 8px; color: #fca5a5; font-size: 14px; min-height: 22px; }
			@media (max-width: 900px) {
				.fan-title { font-size: 28px; }
				.fan-metric-value { font-size: 42px; }
				.fan-metrics { grid-template-columns: 1fr; }
			}
		`]);

		var tempNode = E('div', { 'class': 'fan-metric-value' }, [ '--.- \u00b0C' ]);
		var pwmNode = E('div', { 'class': 'fan-metric-value' }, [ '--' ]);
		var sliderValueNode = E('strong', {}, [ String(status.manual_pwm || status.current_pwm || '140') ]);
		var updatedNode = E('div', { 'class': 'fan-updated' }, [ 'Статус обновлен: --:--:--' ]);
		var messageNode = E('div', { 'class': 'fan-message' }, []);

		var slider = E('input', {
			'type': 'range',
			'class': 'fan-slider',
			'min': '0',
			'max': '255',
			'step': '1',
			'value': String(status.manual_pwm || status.current_pwm || '140')
		});

		var applyBtn = E('button', { 'class': 'fan-btn fan-btn-primary' }, [ 'Применить PWM' ]);
		var quietBtn = E('button', { 'class': 'fan-btn' }, [ 'Тихо' ]);
		var balancedBtn = E('button', { 'class': 'fan-btn' }, [ 'Баланс' ]);
		var turboBtn = E('button', { 'class': 'fan-btn fan-btn-danger' }, [ 'Турбо' ]);
		var autoBtn = E('button', { 'class': 'fan-btn fan-btn-auto' }, [ 'Авто (драйвер)' ]);
		var refreshBtn = E('button', { 'class': 'fan-btn fan-btn-refresh' }, [ 'Обновить' ]);

		function nowTime() {
			var d = new Date();
			return d.toTimeString().slice(0, 8);
		}

		function setBusy(flag) {
			[ slider, applyBtn, quietBtn, balancedBtn, turboBtn, autoBtn, refreshBtn ].forEach(function (el) {
				el.disabled = !!flag;
			});
		}

		function showError(text) {
			dom.content(messageNode, [ text || '' ]);
		}

		function updateStatus(s) {
			status = s || {};
			dom.content(tempNode, [ (status.temp_c ? status.temp_c : '--.-') + ' \u00b0C' ]);
			dom.content(pwmNode, [ status.current_pwm ? status.current_pwm : '--' ]);
			if (status.manual_pwm)
				slider.value = String(status.manual_pwm);
			dom.content(sliderValueNode, [ String(slider.value) ]);
			dom.content(updatedNode, [ 'Статус обновлен: ' + nowTime() ]);
		}

		function execAction(args, okText, failText) {
			setBusy(true);
			showError('');
			return self.callRpc(args).then(function (s) {
				if (s && !s.error) {
					updateStatus(s);
					if (okText)
						dom.content(messageNode, [ okText ]);
				} else {
					showError(failText || 'Ошибка операции');
				}
			}).catch(function () {
				showError(failText || 'Ошибка операции');
			}).finally(function () {
				setBusy(false);
			});
		}

		function refreshStatus() {
			return execAction([ 'status' ], '', 'Ошибка чтения датчиков. Проверь пути thermal/pwm.');
		}

		slider.addEventListener('input', function () {
			dom.content(sliderValueNode, [ String(slider.value) ]);
		});

		applyBtn.addEventListener('click', ui.createHandlerFn(this, function () {
			return execAction([ 'apply_manual', String(slider.value) ], 'Ручной PWM применен', 'Не удалось применить ручной PWM');
		}));

		quietBtn.addEventListener('click', ui.createHandlerFn(this, function () {
			return execAction([ 'preset', 'quiet' ], 'Профиль "Тихо" применен', 'Не удалось применить профиль "Тихо"');
		}));

		balancedBtn.addEventListener('click', ui.createHandlerFn(this, function () {
			return execAction([ 'preset', 'balanced' ], 'Профиль "Баланс" применен', 'Не удалось применить профиль "Баланс"');
		}));

		turboBtn.addEventListener('click', ui.createHandlerFn(this, function () {
			return execAction([ 'preset', 'turbo' ], 'Профиль "Турбо" применен', 'Не удалось применить профиль "Турбо"');
		}));

		autoBtn.addEventListener('click', ui.createHandlerFn(this, function () {
			return execAction([ 'apply_auto' ], 'Автоматический режим драйвера включен', 'Не удалось включить авто-режим');
		}));

		refreshBtn.addEventListener('click', ui.createHandlerFn(this, function () {
			return refreshStatus();
		}));

		updateStatus(status);

		return E('div', { 'class': 'fan-wrap' }, [
			css,
			E('div', { 'class': 'fan-card' }, [
				E('div', { 'class': 'fan-header' }, [
					E('div', { 'class': 'fan-logo' }, [ '◎' ]),
					E('div', {}, [
						E('h2', { 'class': 'fan-title' }, [ 'Управление вентилятором' ]),
						E('div', { 'class': 'fan-subtitle' }, [ 'Панель OpenWrt (PWM + режимы)' ])
					])
				]),
				E('div', { 'class': 'fan-metrics' }, [
					E('div', { 'class': 'fan-metric' }, [
						E('div', { 'class': 'fan-metric-label' }, [ 'Температура' ]),
						tempNode
					]),
					E('div', { 'class': 'fan-metric' }, [
						E('div', { 'class': 'fan-metric-label' }, [ 'Текущий PWM' ]),
						pwmNode
					])
				]),
				E('div', { 'class': 'fan-slider-title' }, [ 'Ручная скорость (0-255): ', sliderValueNode ]),
				slider,
				E('div', { 'class': 'fan-actions' }, [
					applyBtn, quietBtn, balancedBtn, turboBtn, autoBtn, refreshBtn
				]),
				updatedNode,
				messageNode
			])
		]);
	}
});

