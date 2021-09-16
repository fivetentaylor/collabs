import * as crdts from "compoventuals";
import { ContainerRuntimeSource } from "compoventuals-container";

// Async so we can await ContainerRuntimeSource.newRuntime.
(async function () {
  // Create a Runtime intended for use within containers.
  const runtime = await ContainerRuntimeSource.newRuntime(window.parent);

  // Now setup your program, using runtime.
  // Note that you you shouldn't try to load saveData like you
  // would in a non-container app;
  // ContainerRuntimeSource will do that for you.

  // We include a simple collaborative counter as an example;
  // delete the code below and replace with your own.

  // Register collaborative data types.
  const counterCrdt = runtime.registerCrdt(
    "counter",
    crdts.Pre(crdts.CCounter)()
  );

  // Refresh the display when the Crdt state changes, possibly
  // due to a message from another replica.
  const display = document.getElementById("display")!;
  runtime.on("Change", () => {
    display.innerHTML = counterCrdt.value.toString();
  });

  // Change counterCrdt's value on button clicks.
  // Note that we need not refresh the display here, since Change
  // events are also triggered by local operations.
  document.getElementById("increment")!.onclick = () => {
    counterCrdt.add(100);
  };
  document.getElementById("decrement")!.onclick = () => {
    counterCrdt.add(-100);
  };
  document.getElementById("reset")!.onclick = () => {
    counterCrdt.reset();
  };
})();