import { useState } from "react";
import ChatComponent from "./components/chat/chat";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <ChatComponent />
    </div>
  );
}

export default App;
