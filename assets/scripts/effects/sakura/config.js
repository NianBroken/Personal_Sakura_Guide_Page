/*
樱花背景配置。
所有会影响场景行为的常量集中维护，便于后续统一调整。
*/
(function (window) {
	"use strict";

	var namespace = (window.PersonalSakuraGuide = window.PersonalSakuraGuide || {});

	namespace.sakuraConfig = {
		canvasId: "sakura",
		contextAttributes: {
			alpha: true,
			antialias: true,
			depth: true,
			premultipliedAlpha: false,
			preserveDrawingBuffer: false,
			powerPreference: "high-performance",
			stencil: false,
		},
		projection: {
			angle: 60,
			far: 100.0,
			near: 0.1,
		},
		camera: {
			dof: { x: 10.0, y: 4.0, z: 8.0 },
			lookAt: { x: 0.0, y: 0.0, z: 0.0 },
			position: { x: 0.0, y: 0.0, z: 100.0 },
			up: { x: 0.0, y: 1.0, z: 0.0 },
		},
		particle: {
			area: { x: 20.0, y: 20.0, z: 20.0 },
			count: 1600,
			fade: {
				halfDistance: 10.0,
				nearStart: 0.1,
				start: 10.0,
			},
			rotationRange: Math.PI * 2.0 * 0.5,
			size: {
				min: 0.9,
				range: 0.1,
			},
			velocity: {
				base: { x: 0.8, y: -1.0, z: 0.5 },
				speed: {
					min: 2.0,
					range: 1.0,
				},
				variance: { x: 0.3, y: 0.2, z: 0.3 },
			},
		},
		postProcess: {
			blurIterations: 2,
			directionPassBase: 1.5,
			directionPassStep: 1.0,
			strideBase: 2.0,
			strideStep: 1.0,
		},
		render: {
			clearColor: [0.005, 0.0, 0.05, 0.0],
			framebufferClearColor: [0.0, 0.0, 0.0, 0.0],
		},
	};
})(window);
