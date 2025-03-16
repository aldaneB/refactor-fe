import { useGLTF } from "@react-three/drei";
import { useRef, useEffect } from "react";
import { AnimationMixer } from "three";
import { useFrame } from "@react-three/fiber";

// 3D Assistant Component
const AssistantModel = ({ isSpeaking }) => {
  const { scene, animations } = useGLTF("../../assets/baby_yoda.glb"); // Assumes model is in public folder
  const mixer = useRef();
  const modelRef = useRef();

  useEffect(() => {
    if (animations.length) {
      mixer.current = new AnimationMixer(scene);
      const speakAction = mixer.current.clipAction(animations[0]); // Assumes first animation is lip-sync
      speakAction.setLoop(2200, Infinity); // THREE.LoopRepeat
      if (isSpeaking) {
        speakAction.play();
      } else {
        speakAction.stop();
      }
    }
  }, [animations, scene, isSpeaking]);

  useFrame((state, delta) => {
    if (mixer.current && isSpeaking) {
      mixer.current.update(delta);
    }
  });

  return (
    <primitive
      ref={modelRef}
      object={scene}
      scale={1}
      position={[0, -1, 0]}
      rotation={[0, 0, 0]}
    />
  );
};

export default AssistantModel;
