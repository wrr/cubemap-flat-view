/*jslint browser: true, white: true, indent: 2*/
/*global THREE */
/*global Float32Array*/
(function () {
  'use strict';
  var renderFaceVS, renderFaceFS;

  renderFaceVS = [
    "attribute vec3 envLookup;",
    "varying vec3 vEnvLookup;",

    "void main() {",
      "vEnvLookup = envLookup;",
      "gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
    "}"
  ].join("\n");

  renderFaceFS = [
    "uniform samplerCube envMap;",
    "varying vec3 vEnvLookup;",

    "void main() {",
      "gl_FragColor = textureCube(envMap, vEnvLookup);",
    "}"
  ].join("\n");

  // envMap should be RenderTargetCube or CubeTexture.
  THREE.CubeMapFlatView = function(envMap, faceSizePx, paddingLeftPx,
                                   paddingRightPx) {
    var camera, scene, faces = [], faceOffsets = [];

    faceSizePx = (faceSizePx || 128);
    paddingLeftPx = (paddingLeftPx || 10);
    paddingRightPx = (paddingRightPx || 10);

    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    scene  = new THREE.Scene();

    function setEnvLookupVector(vIdx, vEnvLookup, outputArray) {
      outputArray[3 * vIdx] = vEnvLookup[0];
      outputArray[3 * vIdx + 1] = vEnvLookup[1];
      outputArray[3 * vIdx + 2] = vEnvLookup[2];
    }

    function initFaces() {
      var i, material, geometry, vIdx, geometryEnvLookupVectors, envLookupArray;

      // Each vertex of a cube face has an associated envmap lookup
      // vector. These vectors are interpolated for each fragment and
      // used to lookup envmap pixels.
      //
      // See https://scalibq.wordpress.com/2013/06/23/cubemaps/ for
      // the explanation of this mapping and of the cube map layout in
      // general.
      geometryEnvLookupVectors = [
        //up left,  up right,   low left,    low right
        [[1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1]], // cube face 0
        [[-1, 1, -1], [-1, 1, 1], [-1, -1, -1], [-1, -1, 1]], // face 1
        [[-1, 1, -1], [1, 1, -1], [-1, 1, 1], [1, 1, 1]], // face 2
        [[-1, -1, 1], [1, -1, 1], [-1, -1, -1], [1, -1, -1]], // face 3
        [[-1, 1, 1], [1, 1, 1], [-1, -1, 1], [1, -1, 1]], // face 4
        [[1, 1, -1], [-1, 1, -1], [1, -1, -1], [-1, -1, -1]] // face 5
      ];

      material = new THREE.ShaderMaterial({
        vertexShader: renderFaceVS,
        fragmentShader: renderFaceFS,
        uniforms: {
          envMap: {type: 't', value: envMap}
        },
        attributes: {
          envLookup: {type: 'v3', value: null}
        }
      });

      for (i = 0; i < 6; i += 1) {
        geometry = new THREE.PlaneBufferGeometry(faceSizePx, faceSizePx);
        envLookupArray = new Float32Array(12);
        geometry.addAttribute('envLookup',
                              new THREE.BufferAttribute(envLookupArray, 3));
        for (vIdx = 0; vIdx < 4; vIdx += 1) {
          setEnvLookupVector(vIdx, geometryEnvLookupVectors[i][vIdx],
                             envLookupArray);
        }
        faces[i] = new THREE.Mesh(geometry , material);
        scene.add(faces[i]);
      }

      // Faces layout:
      //   2
      // 1 4 0 5
      //   3
      faceOffsets[0] = [2 * faceSizePx, faceSizePx];
      faceOffsets[1] = [0, faceSizePx];
      faceOffsets[2] = [faceSizePx, 0];
      faceOffsets[3] = [faceSizePx, 2 * faceSizePx];
      faceOffsets[4] = [faceSizePx, faceSizePx];
      faceOffsets[5] = [3 * faceSizePx, faceSizePx];
    }
    initFaces();

    function updateFacesPositions(halfWidth, halfHeight) {
      var i, commonOffsetX, commonOffsetY;
      commonOffsetX = -halfWidth + paddingLeftPx + faceSizePx / 2;
      commonOffsetY = halfHeight - paddingRightPx - faceSizePx / 2;

      for (i = 0; i < faces.length; i += 1) {
        faces[i].position.set(commonOffsetX + faceOffsets[i][0],
                              commonOffsetY - faceOffsets[i][1],
                              0);
      }
    }

    this.setSize = function(width, height) {
      var halfWidth = width / 2, halfHeight = height / 2;
      camera.left = -halfWidth;
      camera.right = halfWidth;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
      updateFacesPositions(halfWidth, halfHeight);
    };

    this.render = function(renderer) {
      var autoClearOrig = renderer.autoClear;
      renderer.autoClear = false;
      renderer.render(scene, camera);
      renderer.autoClear = autoClearOrig;
    };
  };

}());