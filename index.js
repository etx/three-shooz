const {
  Scene,
  Color,
  PerspectiveCamera,
  WebGLRenderer,
  Group,
  HemisphereLight,
  SpotLight,
  GLTFLoader,
  DRACOLoader
} = THREE;

class Shooz {
  constructor() {
    this.init = this.init.bind(this);
    this.animate = this.animate.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);

    this.init();
  }

  init() {
    this.renderingEnabled = false;
    this.initRender = false;
    this.renderTimeout = null;

    this.aspect = window.innerWidth / window.innerHeight;
    this.camera = new PerspectiveCamera(35, this.aspect, 1, 1000);
    this.camera.position.z = 24;
    this.camera.position.y = 2;

    this.scene = new Scene();

    this.shoeGroup = new Group();
    this.shoeGroup.scale.set(52, 52, 52);
    this.scene.add(this.shoeGroup);
    this.scene.add(this.camera);

    const light = new HemisphereLight(0xffffff, 0x000000, 0.85);
    this.scene.add(light);

    const spotLight1 = new SpotLight(0xffffff, 1.7);
    spotLight1.position.set(-16, 1, -20);
    spotLight1.castShadow = true;
    spotLight1.shadow.mapSize.width = 1024 * 2;
    spotLight1.shadow.mapSize.height = 1024 * 2;
    spotLight1.penumbra = 0.7;
    spotLight1.angle = Math.PI / 12;
    spotLight1.shadow.bias = -0.0001;

    const spotLight2 = new SpotLight(0xffffff, 1.2);
    spotLight2.position.set(16, 1, -20);
    spotLight2.castShadow = false;
    spotLight2.penumbra = 0.4;
    spotLight2.angle = Math.PI / 12;
    spotLight2.shadow.bias = -0.0001;

    this.camera.add(spotLight1);
    this.camera.add(spotLight2);

    this.renderer = new WebGLRenderer({
      powerPreference: "high-performance",
      antialias: true,
      alpha: true
    });

    this.controls = new THREE.OrbitControls(
      this.camera,
      this.renderer.domElement
    );
    this.controls.target = new THREE.Vector3(0, 3, 0);
    this.controls.enableDamping = true;
    this.controls.enableZoom = false;
    this.controls.addEventListener("start", () => {
      this.renderingEnabled = true;
      clearTimeout(this.renderTimeout)
    });
    this.controls.addEventListener("end", () => {
      this.renderTimeout = setTimeout(() => {
        this.renderingEnabled = false;
      }, 2400)
    });

    document.body.appendChild(this.renderer.domElement).classList.add("shooz");

    window.addEventListener("resize", this.onWindowResize);
    this.onWindowResize()

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setAnimationLoop(this.animate);

    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // this.renderer.physicallyCorrectLights = true;
    this.renderer.gammaOutput = true;
    this.renderer.gammaFactor = 2.2;

    this.renderer.setClearColor(0xffffff, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.soft = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.loadGLTF(
      this.shoeGroup,
      "https://merrell-files.s3.amazonaws.com/models/MTL-LongSky2-shadow.glb",
      () => this.initRender = true
    );
  }

  animate() {
    this.controls.update();
    if (this.renderingEnabled == true || this.initRender == true) {
      this.renderer.render(this.scene, this.camera);
      this.initRender = false
    }
  }

  onWindowResize() {
    // const h = this.renderer.domElement.clientHeight,
    //   w = this.renderer.domElement.clientWidth;
    const h = window.innerHeight,
      w = window.innerWidth;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // this.camera.position.z = 24 / (w/h);
    const r = (w/h);
    const s = 56 * r;
    this.shoeGroup.scale.set(s, s, s)
    this.camera.scale.set(r, r, r)
    this.renderer.setSize(w, h);
    this.initRender = true;
  }

  loadGLTF(group, assetURL, cb) {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(
      "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/js/libs/draco/"
    );
    // https://ga.jspm.io/npm:three-stdlib@2.6.4/libs/draco
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      assetURL,
      function (gltf) {
        gltf.scene.traverse(function (node) {
          if (node.isMesh) {
            switch (node.name) {
              case "Model":
                node.castShadow = true;
                node.receiveShadow = true;
                break;
              case "Plane":
                node.material.side = 1;
                break;
              default:
            }
          }
        });
        group.add(gltf.scene);

        if (cb) cb(gltf)
      },
      function (xhr) {
        console.log(Math.abs((xhr.loaded / xhr.total) * 100) + "% loaded");
      },
      function (error) {
        console.log("An error happened");
      }
    );
  }
}

new Shooz();
