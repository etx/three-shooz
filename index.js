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
    this.avgRenderTimeMS = 1;
    this.animationTime = 1;
    this.animationDirection = 1;
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

    const light = new HemisphereLight(0xffffff, 0xcccccc, 1.9);
    this.scene.add(light);

    const spotLight1 = new SpotLight(0xffffff, 1.9);
    spotLight1.position.set(-32, 1, -16);
    spotLight1.target = this.shoeGroup
    spotLight1.castShadow = true;
    spotLight1.shadow.mapSize.width = 1024 * 2;
    spotLight1.shadow.mapSize.height = 1024 * 2;
    spotLight1.penumbra = 1.5;
    spotLight1.angle = Math.PI / 12;
    spotLight1.shadow.bias = -0.0001;

    const spotLight2 = new SpotLight(0xffffff, 1.2);
    spotLight2.position.set(16, 1, -18);
    spotLight2.target = this.shoeGroup
    spotLight2.castShadow = false;
    spotLight2.penumbra = 0.7;
    spotLight2.angle = Math.PI / 12;
    spotLight2.shadow.bias = -0.0001;

    this.lightGroup = new Group();
    this.lightGroup.add(spotLight1);
    this.lightGroup.add(spotLight2);
    this.camera.add(this.lightGroup)

    this.renderer = new WebGLRenderer({
      powerPreference: "high-performance",
      antialias: (window.devicePixelRatio > 1) ? false : true,
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
    // this.renderer.gammaOutput = true;
    // this.renderer.gammaFactor = 2.4;

    this.renderer.setClearColor(0xffffff, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.soft = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.loadGLTF(
      this.shoeGroup,
      // "https://merrell-files.s3.amazonaws.com/models/MTL-LongSky2-shadow.glb",
      "https://merrell-files.s3.amazonaws.com/models/MTL-MQM-v2.glb",
      () => this.initRender = true
    );

    let observer = new IntersectionObserver((e) => {
      console.log(e)
      this.animationDirection = (e[0].isIntersecting) ? 0 : 1;
      }, {threshold: 0.33});
    observer.observe(this.renderer.domElement)

  }

  animate() {
    this.controls.update();

    if (this.animationTime !== this.animationDirection) {
      const d = this.animationDirection - this.animationTime
      this.animationTime = Math.abs(d) < 0.001 ? this.animationDirection : this.animationTime + (d * 0.03)
    }

    if (this.shouldRender()) {
      this.shoeGroup.position.x = this.lerp(0, -6, this.animationTime);
      this.shoeGroup.rotation.y = this.lerp(0, -0.3, this.animationTime);

      const start = performance.now()
      this.renderer.render(this.scene, this.camera);
      const end = performance.now()
      this.avgRenderTimeMS += ((end - start) - this.avgRenderTimeMS) * 0.1
      this.initRender = false

      if (end > 5000 && this.renderer.shadowMap.enabled == true && this.avgRenderTimeMS > 10) {
        this.renderer.shadowMap.enabled = false
        console.log('shadow disabled')
      }
    }
  }

  shouldRender() {
    return this.renderingEnabled == true 
            || this.initRender == true
            || ( this.animationTime !== 0 && this.animationTime !== 1 )
  }

  onWindowResize() {
    // const h = this.renderer.domElement.clientHeight,
    //   w = this.renderer.domElement.clientWidth;
    const h = window.innerHeight,
          w = window.innerWidth;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const r = (w/h);
    const s = 46 * r;
    this.shoeGroup.scale.set(s, s, s)
    this.renderer.setSize(w, h);
    this.initRender = true;
  }

  loadGLTF(group, assetURL, cb) {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(
      "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/js/libs/draco/"
    );
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

  lerp(v0, v1, t) {
    return v0*(1-t)+v1*t
  }
}

new Shooz();
