/*
渲染所需的基础数学工具。
这里仅保留向量和矩阵计算，避免和业务流程混写。
*/
(function (window) {
	"use strict";

	var namespace = (window.PersonalSakuraGuide = window.PersonalSakuraGuide || {});
	var TWO_PI = Math.PI * 2.0;

	function createVector3(x, y, z) {
		var vector = {
			x: x,
			y: y,
			z: z,
			array: new Float32Array(3),
		};

		vector.array[0] = x;
		vector.array[1] = y;
		vector.array[2] = z;
		return vector;
	}

	function syncVectorArray(vector) {
		vector.array[0] = vector.x;
		vector.array[1] = vector.y;
		vector.array[2] = vector.z;
		return vector.array;
	}

	function setVector3(vector, x, y, z) {
		vector.x = x;
		vector.y = y;
		vector.z = z;
		return syncVectorArray(vector);
	}

	var Vector3 = {
		create: createVector3,
		cross: function (target, left, right) {
			target.x = left.y * right.z - left.z * right.y;
			target.y = left.z * right.x - left.x * right.z;
			target.z = left.x * right.y - left.y * right.x;
			syncVectorArray(target);
		},
		dot: function (left, right) {
			return left.x * right.x + left.y * right.y + left.z * right.z;
		},
		normalize: function (vector) {
			var length = vector.x * vector.x + vector.y * vector.y + vector.z * vector.z;

			if (length > 0.00001) {
				length = 1.0 / Math.sqrt(length);
				vector.x *= length;
				vector.y *= length;
				vector.z *= length;
				syncVectorArray(vector);
			}
		},
		set: setVector3,
		toArray: syncVectorArray,
	};

	var frontVector = createVector3(0.0, 0.0, 0.0);
	var sideVector = createVector3(0.0, 0.0, 0.0);
	var topVector = createVector3(0.0, 0.0, 0.0);

	var Matrix44 = {
		createIdentity: function () {
			return new Float32Array([
				1.0, 0.0, 0.0, 0.0,
				0.0, 1.0, 0.0, 0.0,
				0.0, 0.0, 1.0, 0.0,
				0.0, 0.0, 0.0, 1.0,
			]);
		},
		loadLookAt: function (matrix, position, lookAt, up) {
			setVector3(
				frontVector,
				position.x - lookAt.x,
				position.y - lookAt.y,
				position.z - lookAt.z
			);
			Vector3.normalize(frontVector);
			Vector3.cross(sideVector, up, frontVector);
			Vector3.normalize(sideVector);
			Vector3.cross(topVector, frontVector, sideVector);
			Vector3.normalize(topVector);

			matrix[0] = sideVector.x;
			matrix[1] = topVector.x;
			matrix[2] = frontVector.x;
			matrix[3] = 0.0;

			matrix[4] = sideVector.y;
			matrix[5] = topVector.y;
			matrix[6] = frontVector.y;
			matrix[7] = 0.0;

			matrix[8] = sideVector.z;
			matrix[9] = topVector.z;
			matrix[10] = frontVector.z;
			matrix[11] = 0.0;

			matrix[12] = -(position.x * matrix[0] + position.y * matrix[4] + position.z * matrix[8]);
			matrix[13] = -(position.x * matrix[1] + position.y * matrix[5] + position.z * matrix[9]);
			matrix[14] = -(position.x * matrix[2] + position.y * matrix[6] + position.z * matrix[10]);
			matrix[15] = 1.0;
		},
		loadProjection: function (matrix, aspect, viewAngle, nearPlane, farPlane) {
			var height = nearPlane * Math.tan(((viewAngle * Math.PI) / 180.0) * 0.5) * 2.0;
			var width = height * aspect;

			matrix[0] = (2.0 * nearPlane) / width;
			matrix[1] = 0.0;
			matrix[2] = 0.0;
			matrix[3] = 0.0;

			matrix[4] = 0.0;
			matrix[5] = (2.0 * nearPlane) / height;
			matrix[6] = 0.0;
			matrix[7] = 0.0;

			matrix[8] = 0.0;
			matrix[9] = 0.0;
			matrix[10] = -(farPlane + nearPlane) / (farPlane - nearPlane);
			matrix[11] = -1.0;

			matrix[12] = 0.0;
			matrix[13] = 0.0;
			matrix[14] = (-2.0 * farPlane * nearPlane) / (farPlane - nearPlane);
			matrix[15] = 0.0;
		},
	};

	namespace.sakuraMath = {
		Matrix44: Matrix44,
		TWO_PI: TWO_PI,
		Vector3: Vector3,
	};
})(window);
