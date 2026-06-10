/*
页面启动逻辑。
负责解除预加载状态、更新页脚年份并启动樱花背景。
*/
(function (window, document) {
	"use strict";

	var namespace = (window.PersonalSakuraGuide = window.PersonalSakuraGuide || {});
	var activeRenderer = null;
	var preloadDelay = 100;

	function initializeRenderer() {
		if (typeof namespace.createSakuraRenderer !== "function") {
			return;
		}

		activeRenderer = namespace.createSakuraRenderer();

		if (!activeRenderer.init()) {
			activeRenderer = null;
		}
	}

	function removePreloadState() {
		window.setTimeout(function () {
			document.body.classList.remove("is-preload");
		}, preloadDelay);
	}

	function updateCurrentYear() {
		var yearNode = document.querySelector("[data-current-year]");

		if (!yearNode) {
			return;
		}

		yearNode.textContent = String(new Date().getFullYear());
	}

	function bootstrap() {
		updateCurrentYear();
		initializeRenderer();
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", bootstrap, false);
	} else {
		bootstrap();
	}

	if (document.readyState === "complete") {
		removePreloadState();
	} else {
		window.addEventListener("load", removePreloadState, { once: true });
	}

	namespace.app = namespace.app || {};
	namespace.app.getRenderer = function () {
		return activeRenderer;
	};

	namespace.runtime = namespace.runtime || {};
	namespace.runtime.getRenderer = namespace.app.getRenderer;
})(window, document);
