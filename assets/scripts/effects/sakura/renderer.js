/*
樱花背景渲染器。
负责场景初始化、粒子更新、后处理和生命周期管理。
*/
(function (window, document) {
	"use strict";

	var namespace = (window.PersonalSakuraGuide = window.PersonalSakuraGuide || {});
	var config = namespace.sakuraConfig;
	var glUtils = namespace.sakuraGlUtils;
	var math = namespace.sakuraMath;
	var shaders = namespace.sakuraShaders;

	if (!config || !glUtils || !math || !shaders) {
		return;
	}

	var Matrix44 = math.Matrix44;
	var Vector3 = math.Vector3;
	var TWO_PI = math.TWO_PI;
	var requestFrame =
		window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.msRequestAnimationFrame ||
		function (callback) {
			return window.setTimeout(function () {
				callback(now());
			}, 1000 / 60);
		};
	var cancelFrame =
		window.cancelAnimationFrame ||
		window.webkitCancelAnimationFrame ||
		window.mozCancelAnimationFrame ||
		window.msCancelAnimationFrame ||
		window.clearTimeout;

	function now() {
		if (window.performance && typeof window.performance.now === "function") {
			return window.performance.now();
		}

		return Date.now();
	}

	function symmetryRandom() {
		return Math.random() * 2.0 - 1.0;
	}

	function compareParticlesByDepth(left, right) {
		return left.zkey - right.zkey;
	}

	function BlossomParticle() {
		this.alpha = 1.0;
		this.eulerX = 0.0;
		this.eulerY = 0.0;
		this.eulerZ = 0.0;
		this.positionX = 0.0;
		this.positionY = 0.0;
		this.positionZ = 0.0;
		this.rotationX = 0.0;
		this.rotationY = 0.0;
		this.rotationZ = 0.0;
		this.size = 1.0;
		this.velocityX = 0.0;
		this.velocityY = 0.0;
		this.velocityZ = 0.0;
		this.zkey = 0.0;
	}

	BlossomParticle.prototype.setEulerAngles = function (x, y, z) {
		this.eulerX = x;
		this.eulerY = y;
		this.eulerZ = z;
	};

	BlossomParticle.prototype.setPosition = function (x, y, z) {
		this.positionX = x;
		this.positionY = y;
		this.positionZ = z;
	};

	BlossomParticle.prototype.setRotation = function (x, y, z) {
		this.rotationX = x;
		this.rotationY = y;
		this.rotationZ = z;
	};

	BlossomParticle.prototype.setSize = function (size) {
		this.size = size;
	};

	BlossomParticle.prototype.setVelocity = function (x, y, z) {
		this.velocityX = x;
		this.velocityY = y;
		this.velocityZ = z;
	};

	BlossomParticle.prototype.update = function (deltaSeconds) {
		this.positionX += this.velocityX * deltaSeconds;
		this.positionY += this.velocityY * deltaSeconds;
		this.positionZ += this.velocityZ * deltaSeconds;

		this.eulerX += this.rotationX * deltaSeconds;
		this.eulerY += this.rotationY * deltaSeconds;
		this.eulerZ += this.rotationZ * deltaSeconds;
	};

	function SakuraRenderer() {
		// 场景状态集中挂在实例上，避免散落的全局变量互相污染。
		this.animationFrameId = 0;
		this.canvas = null;
		this.camera = {
			dof: Vector3.create(config.camera.dof.x, config.camera.dof.y, config.camera.dof.z),
			lookAt: Vector3.create(config.camera.lookAt.x, config.camera.lookAt.y, config.camera.lookAt.z),
			matrix: Matrix44.createIdentity(),
			position: Vector3.create(config.camera.position.x, config.camera.position.y, config.camera.position.z),
			up: Vector3.create(config.camera.up.x, config.camera.up.y, config.camera.up.z),
		};
		this.effectLib = {
			brightBuffer: null,
			directionalBlur: null,
			finalComposite: null,
			sceneBackground: null,
		};
		this.gl = null;
		this.isAnimating = false;
		this.isSceneReady = false;
		this.pointFlower = {
			area: Vector3.create(config.particle.area.x, config.particle.area.y, config.particle.area.z),
			buffer: null,
			count: config.particle.count,
			dataArray: null,
			eulerArrayOffset: 0,
			eulerByteOffset: 0,
			fader: Vector3.create(0.0, config.particle.fade.halfDistance, 0.0),
			miscArrayOffset: 0,
			miscByteOffset: 0,
			offset: new Float32Array([0.0, 0.0, 0.0]),
			particles: [],
			positionArrayOffset: 0,
			positionByteOffset: 0,
			program: null,
		};
		this.projection = {
			angle: config.projection.angle,
			matrix: Matrix44.createIdentity(),
			nearfar: new Float32Array([config.projection.near, config.projection.far]),
		};
		this.renderSpec = glUtils.createRenderSpec();
		this.resizeQueued = false;
		this.screenQuadBuffer = null;
		this.screenQuadData = new Float32Array([
			-1.0, -1.0,
			1.0, -1.0,
			-1.0, 1.0,
			1.0, 1.0,
		]);
		this.timeInfo = {
			delta: 0.0,
			elapsed: 0.0,
			prev: 0.0,
		};
		this.visibilityPaused = false;

		this.boundAnimate = this.animate.bind(this);
		this.boundHandleContextLost = this.handleContextLost.bind(this);
		this.boundHandleContextRestored = this.handleContextRestored.bind(this);
		this.boundHandlePageHide = this.handlePageHide.bind(this);
		this.boundHandleResize = this.queueResize.bind(this);
		this.boundHandleVisibilityChange = this.handleVisibilityChange.bind(this);
	}

	SakuraRenderer.prototype.init = function () {
		this.canvas = document.getElementById(config.canvasId);

		if (!this.canvas || !this.initializeContext()) {
			return false;
		}

		this.attachEventListeners();
		if (!this.createSceneResources()) {
			return false;
		}

		this.resize();
		this.resetClock(true);
		this.start();
		return true;
	};

	SakuraRenderer.prototype.attachEventListeners = function () {
		window.addEventListener("resize", this.boundHandleResize, false);
		window.addEventListener("orientationchange", this.boundHandleResize, false);
		window.addEventListener("pagehide", this.boundHandlePageHide, false);
		document.addEventListener("visibilitychange", this.boundHandleVisibilityChange, false);
		this.canvas.addEventListener("webglcontextlost", this.boundHandleContextLost, false);
		this.canvas.addEventListener("webglcontextrestored", this.boundHandleContextRestored, false);
	};

	SakuraRenderer.prototype.bindRenderTarget = function (renderTarget, shouldClear) {
		var clearColor = config.render.framebufferClearColor;

		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, renderTarget.frameBuffer);
		this.gl.viewport(0, 0, renderTarget.width, renderTarget.height);

		if (shouldClear) {
			this.gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
			this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
		}
	};

	SakuraRenderer.prototype.createEffectProgram = function (vertexSource, fragmentSource, extraUniforms, extraAttributes) {
		var attributeNames = ["aPosition"];
		var uniformNames = ["uResolution", "uSrc", "uDelta"];

		if (extraUniforms && extraUniforms.length) {
			uniformNames = uniformNames.concat(extraUniforms);
		}

		if (extraAttributes && extraAttributes.length) {
			attributeNames = attributeNames.concat(extraAttributes);
		}

		return glUtils.createShaderProgram(this.gl, vertexSource, fragmentSource, uniformNames, attributeNames);
	};

	SakuraRenderer.prototype.createPointFlowers = function () {
		var pointFlower = this.pointFlower;
		var strideLength = pointFlower.count * (3 + 3 + 2);
		var index = 0;

		pointFlower.program = glUtils.createShaderProgram(
			this.gl,
			shaders.pointVertex,
			shaders.pointFragment,
			["uProjection", "uModelview", "uResolution", "uOffset", "uDOF", "uFade"],
			["aPosition", "aEuler", "aMisc"]
		);

		pointFlower.dataArray = new Float32Array(strideLength);
		pointFlower.positionArrayOffset = 0;
		pointFlower.eulerArrayOffset = pointFlower.count * 3;
		pointFlower.miscArrayOffset = pointFlower.count * 6;
		pointFlower.positionByteOffset = 0;
		pointFlower.eulerByteOffset = pointFlower.eulerArrayOffset * Float32Array.BYTES_PER_ELEMENT;
		pointFlower.miscByteOffset = pointFlower.miscArrayOffset * Float32Array.BYTES_PER_ELEMENT;
		pointFlower.buffer = this.gl.createBuffer();

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, pointFlower.buffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, pointFlower.dataArray.byteLength, this.gl.DYNAMIC_DRAW);
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

		for (index = 0; index < pointFlower.count; index += 1) {
			pointFlower.particles[index] = new BlossomParticle();
		}
	};

	SakuraRenderer.prototype.createSceneResources = function () {
		// 全屏四边形供背景和后处理复用，避免每个效果重复创建缓冲区。
		this.createScreenQuadBuffer();

		this.effectLib.sceneBackground = this.createEffectProgram(
			shaders.commonVertex,
			shaders.backgroundFragment,
			["uTimes"]
		);
		this.effectLib.brightBuffer = this.createEffectProgram(
			shaders.commonVertex,
			shaders.brightBufferFragment
		);
		this.effectLib.directionalBlur = this.createEffectProgram(
			shaders.commonVertex,
			shaders.directionalBlurFragment,
			["uBlurDir"]
		);
		this.effectLib.finalComposite = this.createEffectProgram(
			shaders.finalCompositeVertex,
			shaders.finalCompositeFragment,
			["uBloom"]
		);

		if (
			!this.effectLib.sceneBackground ||
			!this.effectLib.brightBuffer ||
			!this.effectLib.directionalBlur ||
			!this.effectLib.finalComposite
		) {
			console.error("Failed to create Sakura post-process programs.");
			this.isSceneReady = false;
			return false;
		}

		this.createPointFlowers();

		if (!this.pointFlower.program || !this.pointFlower.buffer) {
			console.error("Failed to create Sakura particle resources.");
			this.isSceneReady = false;
			return false;
		}

		this.isSceneReady = true;
		return true;
	};

	SakuraRenderer.prototype.createScreenQuadBuffer = function () {
		this.screenQuadBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.screenQuadBuffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, this.screenQuadData, this.gl.STATIC_DRAW);
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
	};

	SakuraRenderer.prototype.deleteProgramGroup = function () {
		glUtils.deleteShaderProgram(this.gl, this.effectLib.sceneBackground);
		glUtils.deleteShaderProgram(this.gl, this.effectLib.brightBuffer);
		glUtils.deleteShaderProgram(this.gl, this.effectLib.directionalBlur);
		glUtils.deleteShaderProgram(this.gl, this.effectLib.finalComposite);
		glUtils.deleteShaderProgram(this.gl, this.pointFlower.program);

		this.effectLib.sceneBackground = null;
		this.effectLib.brightBuffer = null;
		this.effectLib.directionalBlur = null;
		this.effectLib.finalComposite = null;
		this.pointFlower.program = null;
	};

	SakuraRenderer.prototype.deleteRenderTargets = function () {
		glUtils.deleteRenderTarget(this.gl, this.renderSpec.mainRT);
		glUtils.deleteRenderTarget(this.gl, this.renderSpec.wHalfRT0);
		glUtils.deleteRenderTarget(this.gl, this.renderSpec.wHalfRT1);

		this.renderSpec.mainRT = null;
		this.renderSpec.wHalfRT0 = null;
		this.renderSpec.wHalfRT1 = null;
	};

	SakuraRenderer.prototype.dispose = function () {
		if (!this.canvas || !this.gl) {
			return;
		}

		this.stop();
		window.removeEventListener("resize", this.boundHandleResize, false);
		window.removeEventListener("orientationchange", this.boundHandleResize, false);
		window.removeEventListener("pagehide", this.boundHandlePageHide, false);
		document.removeEventListener("visibilitychange", this.boundHandleVisibilityChange, false);
		this.canvas.removeEventListener("webglcontextlost", this.boundHandleContextLost, false);
		this.canvas.removeEventListener("webglcontextrestored", this.boundHandleContextRestored, false);

		this.deleteRenderTargets();
		this.deleteProgramGroup();

		if (this.pointFlower.buffer) {
			this.gl.deleteBuffer(this.pointFlower.buffer);
			this.pointFlower.buffer = null;
		}

		if (this.screenQuadBuffer) {
			this.gl.deleteBuffer(this.screenQuadBuffer);
			this.screenQuadBuffer = null;
		}

		this.isSceneReady = false;
		this.gl = null;
		this.canvas = null;
	};

	SakuraRenderer.prototype.drawFullscreenQuad = function (program) {
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.screenQuadBuffer);
		this.gl.vertexAttribPointer(program.attributes.aPosition, 2, this.gl.FLOAT, false, 0, 0);
		this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
	};

	SakuraRenderer.prototype.drawPointFlowerLayer = function (program, offsetX, offsetY, offsetZ) {
		var offset = this.pointFlower.offset;

		offset[0] = offsetX;
		offset[1] = offsetY;
		offset[2] = offsetZ;
		this.gl.uniform3fv(program.uniforms.uOffset, offset);
		this.gl.drawArrays(this.gl.POINTS, 0, this.pointFlower.count);
	};

	SakuraRenderer.prototype.handleContextLost = function (event) {
		event.preventDefault();
		this.stop();
		this.isSceneReady = false;
		this.resetSceneReferences();
	};

	SakuraRenderer.prototype.handleContextRestored = function () {
		if (!this.initializeContext()) {
			return;
		}

		if (!this.createSceneResources()) {
			return;
		}

		this.resize();
		this.resetClock(true);
		this.start();
	};

	SakuraRenderer.prototype.handlePageHide = function () {
		this.stop();
	};

	SakuraRenderer.prototype.handleVisibilityChange = function () {
		if (document.hidden) {
			this.visibilityPaused = true;
			this.stop();
			return;
		}

		if (this.visibilityPaused) {
			this.visibilityPaused = false;
			this.resetClock(false);
			this.start();
		}
	};

	SakuraRenderer.prototype.initializeContext = function () {
		this.gl =
			this.canvas.getContext("webgl", config.contextAttributes) ||
			this.canvas.getContext("experimental-webgl", config.contextAttributes);

		if (!this.gl) {
			console.error("WebGL not supported.");
			this.canvas.style.display = "none";
			return false;
		}

		this.canvas.style.display = "";
		return true;
	};

	SakuraRenderer.prototype.initializePointFlowers = function () {
		var pointFlower = this.pointFlower;
		var tmpVector = Vector3.create(0.0, 0.0, 0.0);
		var particle = null;
		var particleIndex = 0;
		var velocityConfig = config.particle.velocity;
		var speed = 0.0;

		pointFlower.area.x = pointFlower.area.y * this.renderSpec.aspect;
		Vector3.toArray(pointFlower.area);

		pointFlower.fader.x = config.particle.fade.start;
		pointFlower.fader.y = pointFlower.area.z;
		pointFlower.fader.z = config.particle.fade.nearStart;
		Vector3.toArray(pointFlower.fader);

		for (particleIndex = 0; particleIndex < pointFlower.count; particleIndex += 1) {
			particle = pointFlower.particles[particleIndex];

			tmpVector.x = symmetryRandom() * velocityConfig.variance.x + velocityConfig.base.x;
			tmpVector.y = symmetryRandom() * velocityConfig.variance.y + velocityConfig.base.y;
			tmpVector.z = symmetryRandom() * velocityConfig.variance.z + velocityConfig.base.z;
			Vector3.normalize(tmpVector);

			speed = velocityConfig.speed.min + Math.random() * velocityConfig.speed.range;
			particle.setVelocity(tmpVector.x * speed, tmpVector.y * speed, tmpVector.z * speed);
			particle.setRotation(
				symmetryRandom() * config.particle.rotationRange,
				symmetryRandom() * config.particle.rotationRange,
				symmetryRandom() * config.particle.rotationRange
			);
			particle.setPosition(
				symmetryRandom() * pointFlower.area.x,
				symmetryRandom() * pointFlower.area.y,
				symmetryRandom() * pointFlower.area.z
			);
			particle.setEulerAngles(
				Math.random() * TWO_PI,
				Math.random() * TWO_PI,
				Math.random() * TWO_PI
			);
			particle.setSize(config.particle.size.min + Math.random() * config.particle.size.range);
		}
	};

	SakuraRenderer.prototype.initializeScene = function () {
		this.initializePointFlowers();

		this.camera.position.z = this.pointFlower.area.z + this.projection.nearfar[0];
		this.projection.angle =
			(Math.atan2(this.pointFlower.area.y, this.camera.position.z + this.pointFlower.area.z) * 180.0) / Math.PI * 2.0;

		Matrix44.loadProjection(
			this.projection.matrix,
			this.renderSpec.aspect,
			this.projection.angle,
			this.projection.nearfar[0],
			this.projection.nearfar[1]
		);
	};

	SakuraRenderer.prototype.queueResize = function () {
		var renderer = this;

		if (this.resizeQueued) {
			return;
		}

		this.resizeQueued = true;
		requestFrame(function () {
			renderer.resizeQueued = false;

			if (renderer.canvas && renderer.gl) {
				renderer.resize();
			}
		});
	};

	SakuraRenderer.prototype.rebuildRenderTargets = function () {
		this.deleteRenderTargets();
		this.renderSpec.mainRT = glUtils.createRenderTarget(this.gl, this.renderSpec.width, this.renderSpec.height);
		this.renderSpec.wHalfRT0 = glUtils.createRenderTarget(this.gl, this.renderSpec.halfWidth, this.renderSpec.halfHeight);
		this.renderSpec.wHalfRT1 = glUtils.createRenderTarget(this.gl, this.renderSpec.halfWidth, this.renderSpec.halfHeight);
	};

	SakuraRenderer.prototype.render = function () {
		if (!this.isSceneReady) {
			return;
		}

		this.renderScene();
	};

	SakuraRenderer.prototype.renderBackground = function () {
		this.gl.disable(this.gl.DEPTH_TEST);

		this.useEffect(this.effectLib.sceneBackground, null);
		this.gl.uniform2f(this.effectLib.sceneBackground.uniforms.uTimes, this.timeInfo.elapsed, this.timeInfo.delta);
		this.drawFullscreenQuad(this.effectLib.sceneBackground);
		this.unuseEffect(this.effectLib.sceneBackground);

		this.gl.enable(this.gl.DEPTH_TEST);
	};

	SakuraRenderer.prototype.renderPointFlowers = function () {
		var area = this.pointFlower.area;
		var cameraMatrix = this.camera.matrix;
		var dataArray = this.pointFlower.dataArray;
		var particle = null;
		var particleIndex = 0;
		var pointFlower = this.pointFlower;
		var program = pointFlower.program;
		var positionIndex = pointFlower.positionArrayOffset;
		var eulerIndex = pointFlower.eulerArrayOffset;
		var miscIndex = pointFlower.miscArrayOffset;
		var pointFlowerCount = pointFlower.count;

		// 这里保持扁平循环，直接在热路径内更新位置和角度，避免额外函数调用。
		for (particleIndex = 0; particleIndex < pointFlowerCount; particleIndex += 1) {
			particle = pointFlower.particles[particleIndex];
			particle.update(this.timeInfo.delta);

			if (Math.abs(particle.positionX) - particle.size * 0.5 > area.x) {
				particle.positionX += particle.positionX > 0.0 ? -area.x * 2.0 : area.x * 2.0;
			}

			if (Math.abs(particle.positionY) - particle.size * 0.5 > area.y) {
				particle.positionY += particle.positionY > 0.0 ? -area.y * 2.0 : area.y * 2.0;
			}

			if (Math.abs(particle.positionZ) - particle.size * 0.5 > area.z) {
				particle.positionZ += particle.positionZ > 0.0 ? -area.z * 2.0 : area.z * 2.0;
			}

			particle.eulerX %= TWO_PI;
			particle.eulerY %= TWO_PI;
			particle.eulerZ %= TWO_PI;

			if (particle.eulerX < 0.0) {
				particle.eulerX += TWO_PI;
			}

			if (particle.eulerY < 0.0) {
				particle.eulerY += TWO_PI;
			}

			if (particle.eulerZ < 0.0) {
				particle.eulerZ += TWO_PI;
			}

			particle.zkey =
				cameraMatrix[2] * particle.positionX +
				cameraMatrix[6] * particle.positionY +
				cameraMatrix[10] * particle.positionZ +
				cameraMatrix[14];
		}

		pointFlower.particles.sort(compareParticlesByDepth);

		// 深度排序后再回填属性缓冲，保证透明花瓣的叠加顺序稳定。
		for (particleIndex = 0; particleIndex < pointFlowerCount; particleIndex += 1) {
			particle = pointFlower.particles[particleIndex];

			dataArray[positionIndex] = particle.positionX;
			dataArray[positionIndex + 1] = particle.positionY;
			dataArray[positionIndex + 2] = particle.positionZ;
			positionIndex += 3;

			dataArray[eulerIndex] = particle.eulerX;
			dataArray[eulerIndex + 1] = particle.eulerY;
			dataArray[eulerIndex + 2] = particle.eulerZ;
			eulerIndex += 3;

			dataArray[miscIndex] = particle.size;
			dataArray[miscIndex + 1] = particle.alpha;
			miscIndex += 2;
		}

		this.gl.enable(this.gl.BLEND);
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
		glUtils.useShader(this.gl, program);

		this.gl.uniformMatrix4fv(program.uniforms.uProjection, false, this.projection.matrix);
		this.gl.uniformMatrix4fv(program.uniforms.uModelview, false, this.camera.matrix);
		this.gl.uniform3fv(program.uniforms.uResolution, this.renderSpec.array);
		this.gl.uniform3fv(program.uniforms.uDOF, Vector3.toArray(this.camera.dof));
		this.gl.uniform3fv(program.uniforms.uFade, Vector3.toArray(pointFlower.fader));

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, pointFlower.buffer);
		this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, dataArray);
		this.gl.vertexAttribPointer(program.attributes.aPosition, 3, this.gl.FLOAT, false, 0, pointFlower.positionByteOffset);
		this.gl.vertexAttribPointer(program.attributes.aEuler, 3, this.gl.FLOAT, false, 0, pointFlower.eulerByteOffset);
		this.gl.vertexAttribPointer(program.attributes.aMisc, 2, this.gl.FLOAT, false, 0, pointFlower.miscByteOffset);

		this.drawPointFlowerLayer(program, -area.x, -area.y, area.z * -2.0);
		this.drawPointFlowerLayer(program, -area.x, area.y, area.z * -2.0);
		this.drawPointFlowerLayer(program, area.x, -area.y, area.z * -2.0);
		this.drawPointFlowerLayer(program, area.x, area.y, area.z * -2.0);
		this.drawPointFlowerLayer(program, 0.0, 0.0, 0.0);

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
		glUtils.unuseShader(this.gl, program);
		this.gl.enable(this.gl.DEPTH_TEST);
		this.gl.disable(this.gl.BLEND);
	};

	SakuraRenderer.prototype.renderPostProcess = function () {
		var blurIndex = 0;
		var blurPass = 0.0;
		var blurStride = 0.0;
		var postProcessConfig = config.postProcess;

		this.gl.disable(this.gl.DEPTH_TEST);

		this.bindRenderTarget(this.renderSpec.wHalfRT0, true);
		this.useEffect(this.effectLib.brightBuffer, this.renderSpec.mainRT);
		this.drawFullscreenQuad(this.effectLib.brightBuffer);
		this.unuseEffect(this.effectLib.brightBuffer);

		// Bloom 使用横向和纵向双通道模糊，参数保持和旧版本完全一致。
		for (blurIndex = 0; blurIndex < postProcessConfig.blurIterations; blurIndex += 1) {
			blurPass = postProcessConfig.directionPassBase + postProcessConfig.directionPassStep * blurIndex;
			blurStride = postProcessConfig.strideBase + postProcessConfig.strideStep * blurIndex;

			this.bindRenderTarget(this.renderSpec.wHalfRT1, true);
			this.useEffect(this.effectLib.directionalBlur, this.renderSpec.wHalfRT0);
			this.gl.uniform4f(this.effectLib.directionalBlur.uniforms.uBlurDir, blurPass, 0.0, blurStride, 0.0);
			this.drawFullscreenQuad(this.effectLib.directionalBlur);
			this.unuseEffect(this.effectLib.directionalBlur);

			this.bindRenderTarget(this.renderSpec.wHalfRT0, true);
			this.useEffect(this.effectLib.directionalBlur, this.renderSpec.wHalfRT1);
			this.gl.uniform4f(this.effectLib.directionalBlur.uniforms.uBlurDir, 0.0, blurPass, 0.0, blurStride);
			this.drawFullscreenQuad(this.effectLib.directionalBlur);
			this.unuseEffect(this.effectLib.directionalBlur);
		}

		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
		this.gl.viewport(0, 0, this.renderSpec.width, this.renderSpec.height);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

		this.useEffect(this.effectLib.finalComposite, this.renderSpec.mainRT);
		this.gl.uniform1i(this.effectLib.finalComposite.uniforms.uBloom, 1);
		this.gl.activeTexture(this.gl.TEXTURE1);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.renderSpec.wHalfRT0.texture);
		this.drawFullscreenQuad(this.effectLib.finalComposite);
		this.unuseEffect(this.effectLib.finalComposite);

		this.gl.activeTexture(this.gl.TEXTURE1);
		this.gl.bindTexture(this.gl.TEXTURE_2D, null);
		this.gl.activeTexture(this.gl.TEXTURE0);
		this.gl.bindTexture(this.gl.TEXTURE_2D, null);
		this.gl.enable(this.gl.DEPTH_TEST);
	};

	SakuraRenderer.prototype.renderScene = function () {
		var clearColor = config.render.clearColor;

		Matrix44.loadLookAt(this.camera.matrix, this.camera.position, this.camera.lookAt, this.camera.up);
		this.gl.enable(this.gl.DEPTH_TEST);
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.renderSpec.mainRT.frameBuffer);
		this.gl.viewport(0, 0, this.renderSpec.mainRT.width, this.renderSpec.mainRT.height);
		this.gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

		this.renderBackground();
		this.renderPointFlowers();
		this.renderPostProcess();
	};

	SakuraRenderer.prototype.resetClock = function (resetElapsed) {
		this.timeInfo.delta = 0.0;
		this.timeInfo.prev = now();

		if (resetElapsed) {
			this.timeInfo.elapsed = 0.0;
		}
	};

	SakuraRenderer.prototype.resetSceneReferences = function () {
		this.effectLib.sceneBackground = null;
		this.effectLib.brightBuffer = null;
		this.effectLib.directionalBlur = null;
		this.effectLib.finalComposite = null;
		this.pointFlower.buffer = null;
		this.pointFlower.program = null;
		this.renderSpec.mainRT = null;
		this.renderSpec.wHalfRT0 = null;
		this.renderSpec.wHalfRT1 = null;
		this.screenQuadBuffer = null;
	};

	SakuraRenderer.prototype.resize = function () {
		var viewportHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || 1;
		var viewportWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || 1;
		var shouldResize = this.canvas.width !== viewportWidth || this.canvas.height !== viewportHeight;

		if (
			!shouldResize &&
			this.renderSpec.mainRT &&
			this.renderSpec.wHalfRT0 &&
			this.renderSpec.wHalfRT1
		) {
			return;
		}

		// 固定定位画布只跟随视口尺寸，不再扩到整页滚动区域。
		this.canvas.width = viewportWidth;
		this.canvas.height = viewportHeight;
		this.renderSpec.setSize(viewportWidth, viewportHeight);
		this.rebuildRenderTargets();
		this.initializeScene();
		this.render();
	};

	SakuraRenderer.prototype.start = function () {
		if (this.isAnimating) {
			return;
		}

		this.isAnimating = true;
		this.animationFrameId = requestFrame(this.boundAnimate);
	};

	SakuraRenderer.prototype.stop = function () {
		if (!this.isAnimating) {
			return;
		}

		this.isAnimating = false;
		cancelFrame(this.animationFrameId);
		this.animationFrameId = 0;
	};

	SakuraRenderer.prototype.unuseEffect = function (program) {
		glUtils.unuseShader(this.gl, program);
	};

	SakuraRenderer.prototype.useEffect = function (program, sourceTexture) {
		glUtils.useShader(this.gl, program);
		this.gl.uniform3fv(program.uniforms.uResolution, this.renderSpec.array);

		if (!sourceTexture) {
			return;
		}

		this.gl.uniform2fv(program.uniforms.uDelta, sourceTexture.dtxArray);
		this.gl.uniform1i(program.uniforms.uSrc, 0);
		this.gl.activeTexture(this.gl.TEXTURE0);
		this.gl.bindTexture(this.gl.TEXTURE_2D, sourceTexture.texture);
	};

	SakuraRenderer.prototype.animate = function (frameTime) {
		var deltaMilliseconds = frameTime - this.timeInfo.prev;

		if (!this.isAnimating) {
			return;
		}

		this.timeInfo.delta = deltaMilliseconds / 1000.0;
		this.timeInfo.elapsed += this.timeInfo.delta;
		this.timeInfo.prev = frameTime;

		this.render();
		this.animationFrameId = requestFrame(this.boundAnimate);
	};

	namespace.createSakuraRenderer = function () {
		return new SakuraRenderer();
	};
})(window, document);
