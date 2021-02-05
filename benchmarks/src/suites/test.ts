import framework from "../framework";

function addFunc() {
  let x = 0;
  for (let i = 0; i < 1000; i++) {
    x += i;
  }
  return { x };
}

let suite = framework.newSuite("Test");
suite.benchMemory("addFunc#memory", () => {}, addFunc);
suite.benchCpu("addFunc#time", () => {}, addFunc);
suite.benchGeneral(
  "addFunc#network",
  "Traffic sent (bytes)",
  () => {},
  () => {
    return 42;
  },
  1
);
