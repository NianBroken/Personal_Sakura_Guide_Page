/*
WebGL 通用工具。
只处理上下文资源与着色器编译，不介入具体场景逻辑。
*/
(function (window) {
	"use strict";

	var namespace = (window.PersonalSakuraGuide = window.PersonalSakuraGuide || {});

	function createRenderSpec() {
		return {
			array: new Float32Array(3),
			aspect: 1,
			halfArray: new Float32Array(3),
			halfHeight: 0,
			halfWidth: 0,
			height: 0,
			width: 0,
			setSize: function (width, height) {
				var safeWidth = Math.max(1, width);
				var safeHeight = Math.max(1, height);

				this.width = safeWidth;
				this.height = safeHeight;
				this.aspect = safeWidth / safeHeight;
				this.array[0] = safeWidth;
				this.array[1] = safeHeight;
				this.array[2] = this.aspect;

				this.halfWidth = Math.max(1, Math.floor(safeWidth / 2));
				this.halfHeight = Math.max(1, Math.floor(safeHeight / 2));
				this.halfArray[0] = this.halfWidth;
				this.halfArray[1] = this.halfHeight;
				this.halfArray[2] = this.halfWidth / this.halfHeight;
			},
		};
	}

	function createRenderTarget(gl, width, height) {
		var renderTarget = {
			dtxArray: new Float32Array([1.0 / width, 1.0 / height]),
			frameBuffer: gl.createFramebuffer(),
			height: height,
			renderBuffer: gl.createRenderbuffer(),
			sizeArray: new Float32Array([width, height, width / height]),
			texture: gl.createTexture(),
			width: width,
		};

		gl.bindTexture(gl.TEXTURE_2D, renderTarget.texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

		gl.bindFramebuffer(gl.FRAMEBUFFER, renderTarget.frameBuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, renderTarget.texture, 0);

		gl.bindRenderbuffer(gl.RENDERBUFFER, renderTarget.renderBuffer);
		gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderTarget.renderBuffer);

		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		return renderTarget;
	}

	function deleteRenderTarget(gl, renderTarget) {
		if (!renderTarget) {
			return;
		}

		gl.deleteFramebuffer(renderTarget.frameBuffer);
		gl.deleteRenderbuffer(renderTarget.renderBuffer);
		gl.deleteTexture(renderTarget.texture);
	}

	function compileShader(gl, shaderType, shaderSource) {
		var shader = gl.createShader(shaderType);

		gl.shaderSource(shader, shaderSource);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(shader));
			gl.deleteShader(shader);
			return null;
		}

		return shader;
	}

	function createShaderProgram(gl, vertexSource, fragmentSource, uniformNames, attributeNames) {
		var vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
		var fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
		var index = 0;
		var location = -1;
		var program = {
			attributeLocations: [],
			attributes: {},
			handle: null,
			uniforms: {},
		};

		if (!vertexShader || !fragmentShader) {
			return null;
		}

		program.handle = gl.createProgram();
		gl.attachShader(program.handle, vertexShader);
		gl.attachShader(program.handle, fragmentShader);
		gl.deleteShader(vertexShader);
		gl.deleteShader(fragmentShader);
		gl.linkProgram(program.handle);

		if (!gl.getProgramParameter(program.handle, gl.LINK_STATUS)) {
			console.error(gl.getProgramInfoLog(program.handle));
			gl.deleteProgram(program.handle);
			return null;
		}

		if (uniformNames) {
			for (index = 0; index < uniformNames.length; index += 1) {
				program.uniforms[uniformNames[index]] = gl.getUniformLocation(program.handle, uniformNames[index]);
			}
		}

		if (attributeNames) {
			for (index = 0; index < attributeNames.length; index += 1) {
				location = gl.getAttribLocation(program.handle, attributeNames[index]);
				program.attributes[attributeNames[index]] = location;

				if (location >= 0) {
					program.attributeLocations.push(location);
				}
			}
		}

		return program;
	}

	function deleteShaderProgram(gl, program) {
		if (!program || !program.handle) {
			return;
		}

		gl.deleteProgram(program.handle);
	}

	function useShader(gl, program) {
		var index = 0;

		gl.useProgram(program.handle);

		for (index = 0; index < program.attributeLocations.length; index += 1) {
			gl.enableVertexAttribArray(program.attributeLocations[index]);
		}
	}

	function unuseShader(gl, program) {
		var index = 0;

		for (index = 0; index < program.attributeLocations.length; index += 1) {
			gl.disableVertexAttribArray(program.attributeLocations[index]);
		}

		gl.useProgram(null);
	}

	namespace.sakuraGlUtils = {
		createRenderSpec: createRenderSpec,
		createRenderTarget: createRenderTarget,
		createShaderProgram: createShaderProgram,
		deleteRenderTarget: deleteRenderTarget,
		deleteShaderProgram: deleteShaderProgram,
		unuseShader: unuseShader,
		useShader: useShader,
	};
})(window);
