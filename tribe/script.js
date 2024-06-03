$(document).ready(function() {
  // Set up the Three.js scene
  const width = window.innerWidth * 0.8;
  const height = window.innerHeight * 0.6;

  const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 10);
  
  // Function to update camera position based on screen size
  function updateCameraPosition() {
    if (window.innerWidth < 600) {
      camera.position.set(0, -1, 5); // Adjust camera position for small screens
    } else {
      camera.position.set(5, 0, 5); // Adjust camera position for larger screens
    }
  }

  // Call the updateCameraPosition function initially
  updateCameraPosition();

  // Add an event listener to update camera position on window resize
  window.addEventListener('resize', updateCameraPosition);

  const scene = new THREE.Scene();

  const loader = new THREE.GLTFLoader();

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setAnimationLoop(animation);
  $(".keyring-container").append(renderer.domElement);

  // Add ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  // Add directional light
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  // Load the GLTF model
  let model; // Declare the model variable
  loader.load('model.gltf', function(gltf) {
    model = gltf.scene;
    
    // Scale the model
      function updateScalePosition() {
    if (window.innerWidth < 600) {
        model.scale.set(0.51, -0.51, 0.51); // Adjust the scale values as needed
    } else {
        model.scale.set(0.71, -0.7, 0.71); // Adjust the scale values as needed
    }
  }
  updateScalePosition();
    
    // Traverse the model's children and modify their materials
    model.traverse(function(child) {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: 0xffffff, // Set the color to white
          roughness: 0.5, // Adjust the roughness as desired
          metalness: 0.5 // Adjust the metalness as desired
        });
      }
    });
    
    scene.add(model);
    
    // Change material color every 5 seconds
    let colorIndex = 0;
    const colors = [0xffffff, 0x4c4c4c, 0xFF0000]; // White, black, gold
    setInterval(function() {
      model.traverse(function(child) {
        if (child.isMesh) {
          child.material.color.setHex(colors[colorIndex]);
        }
      });
      colorIndex = (colorIndex + 1) % colors.length;
    }, 5000);
  }, function(progress) {
    console.log('Loading model...', (progress.loaded / progress.total) * 100 + '%');
  }, function(error) {
    console.error('Error loading model:', error);
  });

  // Animation
  function animation(time) {
    // Update the model's rotation if needed
    if (model) {
      model.rotation.x = time / 2000;
      model.rotation.y = time / 1000;
    }
    
    // Update the camera aspect ratio
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.render(scene, camera);
  }
});
