import { assert } from "chai";
import {
  AddEvent,
  AddWinsSet,
  CrdtRuntime,
  DisableWinsFlag,
  EnableWinsFlag,
  GSet,
  JsonCrdt,
  JsonCursor,
  KeyEvent,
  LwwMap,
  MapCrdt,
  MapEvent,
  NumberCrdt,
} from "../../src/crdts";
import { debug } from "../debug";

import { TestingNetworkGenerator } from "../../src/network";
import seedrandom from "seedrandom";

describe("standard", () => {
  let runtimeGen: TestingNetworkGenerator;
  let alice: CrdtRuntime;
  let bob: CrdtRuntime;
  let rng: seedrandom.prng;

  beforeEach(() => {
    rng = seedrandom("42");
    runtimeGen = new TestingNetworkGenerator();
    alice = runtimeGen.newRuntime("immediate", rng);
    bob = runtimeGen.newRuntime("immediate", rng);
  });

  describe("EnableWinsFlag", () => {
    let aliceFlag: EnableWinsFlag;
    let bobFlag: EnableWinsFlag;

    beforeEach(() => {
      aliceFlag = alice
        .groupParent("")
        .addChild("ewFlagId", new EnableWinsFlag());
      bobFlag = bob.groupParent("").addChild("ewFlagId", new EnableWinsFlag());
      if (debug) {
        addEventListeners(aliceFlag, "Alice");
        addEventListeners(bobFlag, "Bob");
      }
    });

    function addEventListeners(flag: EnableWinsFlag, name: string): void {
      flag.on("Enable", (event) =>
        console.log(`${name}: ${event.timestamp.getSender()} enabled`)
      );
      flag.on("Disable", (event) =>
        console.log(`${name}: ${event.timestamp.getSender()} disabled`)
      );
    }

    it("is initially false", () => {
      assert.isFalse(aliceFlag.enabled);
      assert.isFalse(bobFlag.enabled);
    });

    it("works with non-concurrent updates", () => {
      aliceFlag.enable();
      assert.isTrue(aliceFlag.enabled);
      assert.isFalse(bobFlag.enabled);

      runtimeGen.releaseAll();
      assert.isTrue(aliceFlag.enabled);
      assert.isTrue(bobFlag.enabled);

      aliceFlag.disable();
      assert.isFalse(aliceFlag.enabled);
      assert.isTrue(bobFlag.enabled);

      runtimeGen.releaseAll();
      assert.isFalse(aliceFlag.enabled);
      assert.isFalse(bobFlag.enabled);
    });

    it("works with non-concurrent updates", () => {
      aliceFlag.enable();
      bobFlag.disable();
      assert.isTrue(aliceFlag.enabled);
      assert.isFalse(bobFlag.enabled);

      // Enable wins
      runtimeGen.releaseAll();
      assert.isTrue(aliceFlag.enabled);
      assert.isTrue(bobFlag.enabled);
    });

    describe("enable", () => {
      it("emits an Enable event", async () => {
        const promise = Promise.all([
          aliceFlag.nextEvent("Enable"),
          bobFlag.nextEvent("Enable"),
        ]);
        aliceFlag.on("Disable", () =>
          assert.fail("Did not expect Disable event from Alice")
        );
        bobFlag.on("Disable", () => {
          assert.fail("Did not expect Disable event from Bob");
        });

        aliceFlag.enable();
        runtimeGen.releaseAll();

        await promise;
      });
    });

    describe("disable", () => {
      it("emits a Disable event", async () => {
        const promise = Promise.all([
          aliceFlag.nextEvent("Disable"),
          bobFlag.nextEvent("Disable"),
        ]);
        aliceFlag.on("Enable", () =>
          assert.fail("Did not expect Enable event from Alice")
        );
        bobFlag.on("Enable", () => {
          assert.fail("Did not expect Enable event from Bob");
        });

        aliceFlag.disable();
        runtimeGen.releaseAll();

        await promise;
      });
    });
  });

  describe("DisableWinsFlag", () => {
    let aliceFlag: DisableWinsFlag;
    let bobFlag: DisableWinsFlag;

    beforeEach(() => {
      aliceFlag = alice
        .groupParent("")
        .addChild("dwFlagId", new DisableWinsFlag());
      bobFlag = bob.groupParent("").addChild("dwFlagId", new DisableWinsFlag());
      if (debug) {
        addEventListeners(aliceFlag, "Alice");
        addEventListeners(bobFlag, "Bob");
      }
    });

    function addEventListeners(flag: DisableWinsFlag, name: string): void {
      flag.on("Enable", (event) =>
        console.log(`${name}: ${event.timestamp.getSender()} enabled`)
      );
      flag.on("Disable", (event) =>
        console.log(`${name}: ${event.timestamp.getSender()} disabled`)
      );
    }

    it("is initially true", () => {
      assert.isTrue(aliceFlag.enabled);
      assert.isTrue(bobFlag.enabled);
    });

    it("works with non-concurrent updates", () => {
      bobFlag.enable();
      runtimeGen.releaseAll();
      assert.isTrue(aliceFlag.enabled);
      assert.isTrue(bobFlag.enabled);

      aliceFlag.disable();
      runtimeGen.releaseAll();
      assert.isFalse(aliceFlag.enabled);
      assert.isFalse(bobFlag.enabled);
    });

    it("works with non-concurrent updates", () => {
      aliceFlag.enable();
      bobFlag.disable();
      assert.isTrue(aliceFlag.enabled);
      assert.isFalse(bobFlag.enabled);

      // Disable wins
      runtimeGen.releaseAll();
      assert.isFalse(aliceFlag.enabled);
      assert.isFalse(bobFlag.enabled);
    });

    describe("enable", () => {
      it("emits an Enable event", async () => {
        const promise = Promise.all([
          aliceFlag.nextEvent("Enable"),
          bobFlag.nextEvent("Enable"),
        ]);
        aliceFlag.on("Disable", () =>
          assert.fail("Did not expect Enable event from Alice")
        );
        bobFlag.on("Disable", () => {
          assert.fail("Did not expect Disable event from Bob");
        });

        aliceFlag.enable();
        runtimeGen.releaseAll();

        await promise;
      });
    });

    describe("disable", () => {
      it("emits a Disable event", async () => {
        const promise = Promise.all([
          aliceFlag.nextEvent("Disable"),
          bobFlag.nextEvent("Disable"),
        ]);
        aliceFlag.on("Enable", () =>
          assert.fail("Did not expect Enable event from Alice")
        );
        bobFlag.on("Enable", () => {
          assert.fail("Did not expect Enable event from Bob");
        });

        aliceFlag.disable();
        runtimeGen.releaseAll();

        await promise;
      });
    });
  });

  describe("Number", () => {
    let aliceNumber: NumberCrdt;
    let bobNumber: NumberCrdt;

    beforeEach(() => init(0));

    function init(initialValue: number, name = "numberId"): void {
      aliceNumber = alice
        .groupParent("")
        .addChild(name, new NumberCrdt(initialValue));
      bobNumber = bob
        .groupParent("")
        .addChild(name, new NumberCrdt(initialValue));
      if (debug) {
        addEventListeners(aliceNumber, "Alice");
        addEventListeners(bobNumber, "Bob");
      }
    }

    function addEventListeners(number: NumberCrdt, name: string): void {
      number.on("Add", (event) =>
        console.log(
          `${name}: ${event.timestamp.getSender()} added ${
            (event as AddEvent).valueAdded
          }`
        )
      );

      number.on("Mult", (event) =>
        console.log(
          `${name}: ${event.timestamp.getSender()} multed ${event.valueMulted}`
        )
      );
      number.on("Reset", (event) =>
        console.log(
          `${name}: ${event.timestamp.getSender()} reset ${event.timestamp.getSender()}`
        )
      );
    }

    it("is initially 0", () => {
      assert.strictEqual(aliceNumber.value, 0);
      assert.strictEqual(bobNumber.value, 0);
    });

    describe("add", () => {
      it("works with non-concurrent updates", () => {
        aliceNumber.add(3);
        runtimeGen.releaseAll();
        assert.strictEqual(aliceNumber.value, 3);
        assert.strictEqual(bobNumber.value, 3);

        bobNumber.add(-4);
        runtimeGen.releaseAll();
        assert.strictEqual(aliceNumber.value, -1);
        assert.strictEqual(bobNumber.value, -1);
      });

      it("works with concurrent updates", () => {
        aliceNumber.add(3);
        bobNumber.add(-4);
        assert.strictEqual(aliceNumber.value, 3);
        assert.strictEqual(bobNumber.value, -4);

        runtimeGen.releaseAll();
        assert.strictEqual(aliceNumber.value, -1);
        assert.strictEqual(bobNumber.value, -1);
      });
    });

    describe("add and mult", () => {
      it("works with non-concurrent updates", () => {
        aliceNumber.add(3);
        runtimeGen.releaseAll();
        assert.strictEqual(aliceNumber.value, 3);
        assert.strictEqual(bobNumber.value, 3);

        bobNumber.mult(-4);
        runtimeGen.releaseAll();
        assert.strictEqual(aliceNumber.value, -12);
        assert.strictEqual(bobNumber.value, -12);

        aliceNumber.add(7);
        runtimeGen.releaseAll();
        assert.strictEqual(aliceNumber.value, -5);
        assert.strictEqual(bobNumber.value, -5);
      });

      it("works with concurrent updates", () => {
        aliceNumber.add(2);
        assert.strictEqual(aliceNumber.value, 2);
        assert.strictEqual(bobNumber.value, 0);

        bobNumber.add(1);
        bobNumber.mult(5);
        assert.strictEqual(aliceNumber.value, 2);
        assert.strictEqual(bobNumber.value, 5);

        // Arbitration order places multiplication last
        runtimeGen.releaseAll();
        assert.strictEqual(aliceNumber.value, 15);
        assert.strictEqual(bobNumber.value, 15);
      });

      it("works with the example from the paper", () => {
        // See https://arxiv.org/abs/2004.04303, §3.1
        init(1, "numberIdPaper");

        aliceNumber.mult(2);
        aliceNumber.add(1);
        bobNumber.mult(3);
        bobNumber.add(4);
        assert.strictEqual(aliceNumber.value, 3);
        assert.strictEqual(bobNumber.value, 7);

        runtimeGen.releaseAll();
        assert.strictEqual(aliceNumber.value, 17);
        assert.strictEqual(bobNumber.value, 17);
      });
    });

    describe("reset", () => {
      it("resets to the initial value", () => {
        aliceNumber.add(1);
        aliceNumber.reset();
        runtimeGen.releaseAll();
        assert.strictEqual(aliceNumber.value, 0);
        assert.strictEqual(bobNumber.value, 0);
      });

      it("works with non-concurrent updates", () => {
        aliceNumber.add(3);
        runtimeGen.releaseAll();
        assert.strictEqual(aliceNumber.value, 3);
        assert.strictEqual(bobNumber.value, 3);

        aliceNumber.reset();
        aliceNumber.add(11);
        runtimeGen.releaseAll();
        assert.strictEqual(aliceNumber.value, 11);
        assert.strictEqual(bobNumber.value, 11);
      });

      it("lets concurrent adds survive", () => {
        aliceNumber.reset();
        bobNumber.add(10);
        runtimeGen.releaseAll();
        assert.strictEqual(aliceNumber.value, 10);
        assert.strictEqual(bobNumber.value, 10);
      });
    });

    describe("strongReset", () => {
      it.skip("works with non-concurrent updates", () => {
        // bobNumber.strongReset();
        // runtimeGen.releaseAll();
        // assert.strictEqual(aliceNumber.value, 0);
        // assert.strictEqual(bobNumber.value, 0);
        //
        // aliceNumber.add(6);
        // runtimeGen.releaseAll();
        // assert.strictEqual(aliceNumber.value, 6);
        // assert.strictEqual(bobNumber.value, 6);
      });

      it.skip("does not let concurrent add survive", () => {
        // aliceNumber.strongReset();
        // bobNumber.add(20);
        // runtimeGen.releaseAll();
        // assert.strictEqual(aliceNumber.value, 0);
        // assert.strictEqual(bobNumber.value, 0);
      });
    });

    it("works with lots of concurrency", () => {
      aliceNumber.add(3);
      bobNumber.add(7);
      aliceNumber.reset();
      runtimeGen.release(bob);
      assert.strictEqual(aliceNumber.value, 7);
      assert.strictEqual(bobNumber.value, 7);

      // TODO
      // bobNumber.strongReset();
      // runtimeGen.releaseAll();
      // assert.strictEqual(aliceNumber.value, 0);
      // assert.strictEqual(bobNumber.value, 0);
    });
  });

  describe("AddWinsSet", () => {
    let aliceSet: AddWinsSet<string>;
    let bobSet: AddWinsSet<string>;

    beforeEach(() => {
      aliceSet = alice.groupParent("").addChild("awSetId", new AddWinsSet());
      bobSet = bob.groupParent("").addChild("awSetId", new AddWinsSet());
      if (debug) {
        addEventListeners(aliceSet, "Alice");
        addEventListeners(bobSet, "Bob");
      }
    });

    function addEventListeners(set: AddWinsSet<string>, name: string): void {
      set.on("SetAdd", (event) =>
        console.log(
          `${name}: ${event.timestamp.getSender()} added ${event.element}`
        )
      );
      set.on("SetDelete", (event) =>
        console.log(
          `${name}: ${event.timestamp.getSender()} deleted ${event.element}`
        )
      );
    }

    it("is initially empty", () => {
      assert.deepStrictEqual(aliceSet.value, new Set());
      assert.deepStrictEqual(bobSet.value, new Set());
    });

    describe("add", () => {
      it("works with non-concurrent updates", () => {
        aliceSet.add("element");
        runtimeGen.releaseAll();
        assert.deepStrictEqual(aliceSet.value, new Set(["element"]));
        assert.deepStrictEqual(bobSet.value, new Set(["element"]));

        bobSet.add("7");
        runtimeGen.releaseAll();
        assert.deepStrictEqual(aliceSet.value, new Set(["element", "7"]));
        assert.deepStrictEqual(bobSet.value, new Set(["element", "7"]));

        aliceSet.add("7");
        runtimeGen.releaseAll();
        assert.deepStrictEqual(aliceSet.value, new Set(["element", "7"]));
        assert.deepStrictEqual(bobSet.value, new Set(["element", "7"]));
      });

      it("works with concurrent updates", () => {
        aliceSet.add("first");
        assert.deepStrictEqual(aliceSet.value, new Set(["first"]));
        assert.deepStrictEqual(bobSet.value, new Set([]));

        bobSet.add("second");
        assert.deepStrictEqual(aliceSet.value, new Set(["first"]));
        assert.deepStrictEqual(bobSet.value, new Set(["second"]));

        runtimeGen.releaseAll();
        assert.deepStrictEqual(aliceSet.value, new Set(["first", "second"]));
        assert.deepStrictEqual(bobSet.value, new Set(["first", "second"]));
      });
    });

    describe("delete", () => {
      it("deletes existing elements", () => {
        aliceSet.add("element");
        runtimeGen.releaseAll();
        assert.deepStrictEqual(aliceSet.value, new Set(["element"]));
        assert.deepStrictEqual(bobSet.value, new Set(["element"]));

        aliceSet.delete("element");
        runtimeGen.releaseAll();
        assert.deepStrictEqual(aliceSet.value, new Set([]));
        assert.deepStrictEqual(bobSet.value, new Set([]));
      });

      it("does not delete non-existing elements", () => {
        bobSet.delete("nonexistent");
        runtimeGen.releaseAll();
        assert.deepStrictEqual(aliceSet.value, new Set([]));
        assert.deepStrictEqual(bobSet.value, new Set([]));
      });

      it("does not delete concurrently added elements", () => {
        // Adds win over deletes
        aliceSet.add("concurrent");
        aliceSet.delete("concurrent");
        bobSet.add("concurrent");
        runtimeGen.releaseAll();
        assert.deepStrictEqual(aliceSet.value, new Set(["concurrent"]));
        assert.deepStrictEqual(bobSet.value, new Set(["concurrent"]));
      });
    });

    describe("strongDelete", () => {
      it.skip("deletes existing elements", () => {
        // aliceSet.add("element");
        // runtimeGen.releaseAll();
        // assert.deepStrictEqual(aliceSet.value, new Set(["element"]));
        // assert.deepStrictEqual(bobSet.value, new Set(["element"]));
        //
        // aliceSet.strongDelete("element");
        // runtimeGen.releaseAll();
        // assert.deepStrictEqual(aliceSet.value, new Set([]));
        // assert.deepStrictEqual(bobSet.value, new Set([]));
      });

      it.skip("does not delete non-existing elements", () => {
        // bobSet.strongDelete("nonexistent");
        // runtimeGen.releaseAll();
        // assert.deepStrictEqual(aliceSet.value, new Set([]));
        // assert.deepStrictEqual(bobSet.value, new Set([]));
      });

      it.skip("deletes concurrently added elements", () => {
        // // Deletes win over adds
        // aliceSet.add("concurrent");
        // aliceSet.strongDelete("concurrent");
        // bobSet.add("concurrent");
        // runtimeGen.releaseAll();
        // assert.deepStrictEqual(aliceSet.value, new Set([]));
        // assert.deepStrictEqual(bobSet.value, new Set([]));
      });
    });

    describe("reset", () => {
      it("lets concurrent adds survive", () => {
        bobSet.add("first");
        bobSet.add("second");
        runtimeGen.releaseAll();
        assert.deepStrictEqual(aliceSet.value, new Set(["first", "second"]));
        assert.deepStrictEqual(bobSet.value, new Set(["first", "second"]));

        bobSet.reset();
        aliceSet.add("survivor");
        assert.deepStrictEqual(
          aliceSet.value,
          new Set(["survivor", "first", "second"])
        );
        assert.deepStrictEqual(bobSet.value, new Set([]));

        runtimeGen.releaseAll();
        assert.deepStrictEqual(aliceSet.value, new Set(["survivor"]));
        assert.deepStrictEqual(bobSet.value, new Set(["survivor"]));
      });
    });

    // TODO: test strong reset once it is implemented.
    //   describe("strongReset", () => {
    //     it("does not let concurrent adds survive", () => {
    //       bobSet.add("first");
    //       bobSet.add("second");
    //       runtimeGen.releaseAll();
    //       assert.deepStrictEqual(aliceSet.value, new Set(["first", "second"]));
    //       assert.deepStrictEqual(bobSet.value, new Set(["first", "second"]));
    //
    //       bobSet.strongReset();
    //       aliceSet.add("survivor");
    //       assert.deepStrictEqual(aliceSet.value, new Set(["survivor"]));
    //       assert.deepStrictEqual(bobSet.value, new Set([]));
    //
    //       runtimeGen.releaseAll();
    //       assert.deepStrictEqual(aliceSet.value, new Set([]));
    //       assert.deepStrictEqual(bobSet.value, new Set([]));
    //     });
    //   });
    describe("gc", () => {
      it("garbage collects deleted entries", async () => {
        for (let i = 0; i < 100; i++) {
          aliceSet.add(i + "");
        }
        runtimeGen.releaseAll();
        for (let i = 0; i < 100; i++) {
          if (i < 50) aliceSet.delete(i + "");
          else bobSet.delete(i + "");
        }
        runtimeGen.releaseAll();
        await new Promise((resolve) => setTimeout(resolve, 10));
        // @ts-ignore flagMap is private
        assert.strictEqual(aliceSet.flagMap.explicitSize, 0);
        // @ts-ignore flagMap is private
        assert.strictEqual(bobSet.flagMap.explicitSize, 0);
      });

      it("does not garbage collect non-deleted entries", async () => {
        for (let i = 0; i < 100; i++) {
          aliceSet.add(i + "");
        }
        runtimeGen.releaseAll();
        // Check nothing has happened synchronously
        assert.strictEqual(aliceSet.size, 100);
        assert.strictEqual(bobSet.size, 100);
        // @ts-ignore flagMap is private
        assert.strictEqual(aliceSet.flagMap.explicitSize, 100);
        // @ts-ignore flagMap is private
        assert.strictEqual(bobSet.flagMap.explicitSize, 100);

        // Wait for GC to actually run
        await new Promise((resolve) => setTimeout(resolve, 10));
        assert.strictEqual(aliceSet.size, 100);
        assert.strictEqual(bobSet.size, 100);
        // @ts-ignore flagMap is private
        assert.strictEqual(aliceSet.flagMap.explicitSize, 100);
        // @ts-ignore flagMap is private
        assert.strictEqual(bobSet.flagMap.explicitSize, 100);
      });

      it("does not garbage collect synchronously", async () => {
        for (let i = 0; i < 100; i++) {
          aliceSet.add(i + "");
        }
        runtimeGen.releaseAll();
        for (let i = 0; i < 100; i++) {
          if (i < 50) aliceSet.delete(i + "");
          else bobSet.delete(i + "");
        }
        runtimeGen.releaseAll();

        // Don't wait for GC to run; it shouldn't GC yet
        assert.strictEqual(aliceSet.size, 0);
        assert.strictEqual(bobSet.size, 0);
        // @ts-ignore flagMap is private
        assert.strictEqual(aliceSet.flagMap.explicitSize, 100);
        // @ts-ignore flagMap is private
        assert.strictEqual(bobSet.flagMap.explicitSize, 100);
      });
    });
  });

  describe("MapCrdt", () => {
    let aliceMap: MapCrdt<string, NumberCrdt>;
    let bobMap: MapCrdt<string, NumberCrdt>;

    beforeEach(() => {
      const valueConstructor = () => new NumberCrdt();
      aliceMap = alice
        .groupParent("")
        .addChild("map", new MapCrdt(valueConstructor));
      bobMap = bob
        .groupParent("")
        .addChild("map", new MapCrdt(valueConstructor));
      if (debug) {
        addEventListeners(aliceMap, "Alice");
        addEventListeners(bobMap, "Bob");
      }
    });

    function addEventListeners<K, V extends Object | null>(
      map: MapCrdt<any, any>,
      name: string
    ): void {
      // TODO: add listeners once map supports them.
    }

    it("is initially empty", () => {
      assert.deepStrictEqual(new Set(aliceMap.keys()), new Set([]));
      assert.deepStrictEqual(new Set(bobMap.keys()), new Set([]));
    });

    describe("addKey", () => {
      it("works with non-concurrent updates", () => {
        aliceMap.addKey("test");
        runtimeGen.releaseAll();
        assert.deepStrictEqual(new Set(aliceMap.keys()), new Set(["test"]));
        assert.deepStrictEqual(new Set(bobMap.keys()), new Set(["test"]));
      });
    });

    describe("has", () => {
      it("returns true if the key is in the map", () => {
        aliceMap.addKey("test");
        assert.isTrue(aliceMap.has("test"));
        assert.isFalse(bobMap.has("test"));

        runtimeGen.releaseAll();
        assert.isTrue(aliceMap.has("test"));
        assert.isTrue(bobMap.has("test"));
      });

      it("returns false if the key is not in the map", () => {
        aliceMap.addKey("test");
        assert.isFalse(aliceMap.has("not in map"));
        assert.isFalse(bobMap.has("not in map"));

        runtimeGen.releaseAll();
        assert.isFalse(aliceMap.has("not in map"));
        assert.isFalse(bobMap.has("not in map"));
      });
    });

    describe("get", () => {
      it("returns the value if the key is in the map", () => {
        aliceMap.addKey("test");
        runtimeGen.releaseAll();
        const aliceTest = aliceMap.get("test")!;
        const bobTest = bobMap.get("test")!;
        assert.isOk(aliceTest);
        assert.isOk(bobTest);
        assert.strictEqual(aliceTest.value, 0);
        assert.strictEqual(bobTest.value, 0);
      });

      it("returns undefined if the key is not in the map", () => {
        aliceMap.addKey("test");
        runtimeGen.releaseAll();
        const aliceTest = aliceMap.get("not in map");
        const bobTest = bobMap.get("not in map");
        assert.isUndefined(aliceTest);
        assert.isUndefined(bobTest);
      });

      it("returns a CRDT that can be modified", () => {
        aliceMap.addKey("test");
        runtimeGen.releaseAll();
        const aliceTest = aliceMap.get("test")!;
        const bobTest = bobMap.get("test")!;
        aliceTest.add(3);
        bobTest.add(4);
        runtimeGen.releaseAll();
        assert.strictEqual(aliceTest.value, 7);
        assert.strictEqual(bobTest.value, 7);
      });
    });

    describe("delete", () => {
      it("deletes existing elements", () => {
        bobMap.addKey("test");
        runtimeGen.releaseAll();
        assert.deepStrictEqual(new Set(aliceMap.keys()), new Set(["test"]));

        bobMap.delete("test");
        runtimeGen.releaseAll();
        assert.deepStrictEqual(new Set(aliceMap.keys()), new Set([]));
        assert.deepStrictEqual(new Set(bobMap.keys()), new Set([]));
        assert.isUndefined(aliceMap.get("test"));
        assert.isUndefined(bobMap.get("test"));
      });

      it("does not delete non-existing elements", () => {
        bobMap.delete("test");
        runtimeGen.releaseAll();
        assert.deepStrictEqual(new Set(aliceMap.keys()), new Set([]));
        assert.deepStrictEqual(new Set(bobMap.keys()), new Set([]));
        assert.isUndefined(aliceMap.get("test"));
        assert.isUndefined(bobMap.get("test"));
      });

      it("lets concurrent value operation survive", () => {
        aliceMap.addKey("register");
        runtimeGen.releaseAll();
        assert.deepStrictEqual(new Set(aliceMap.keys()), new Set(["register"]));
        assert.deepStrictEqual(new Set(bobMap.keys()), new Set(["register"]));

        const bobRegister = bobMap.get("register");
        assert.isFalse(bobRegister === undefined);

        aliceMap.delete("register");
        bobRegister!.add(3);
        runtimeGen.releaseAll();
        assert.deepStrictEqual(new Set(aliceMap.keys()), new Set(["register"]));
        assert.deepStrictEqual(new Set(bobMap.keys()), new Set(["register"]));
        assert.strictEqual(bobRegister!.value, 3);

        const aliceRegister = aliceMap.get("register");
        assert.isFalse(aliceRegister === undefined);
        assert.strictEqual(aliceRegister!.value, 3);
      });
    });

    describe("reset", () => {
      let aliceRegister: NumberCrdt;
      let bobRegister: NumberCrdt;

      beforeEach(() => {
        aliceMap.addKey("register");
        runtimeGen.releaseAll();
        assert.deepStrictEqual(new Set(aliceMap.keys()), new Set(["register"]));
        assert.deepStrictEqual(new Set(bobMap.keys()), new Set(["register"]));

        bobRegister = bobMap.get("register")!;
        assert.isFalse(bobRegister === undefined);
        aliceRegister = aliceMap.get("register")!;
        assert.isFalse(aliceRegister === undefined);
      });

      it("lets concurrent add survive", () => {
        aliceMap.reset();
        assert.deepStrictEqual(new Set(aliceMap.keys()), new Set([]));
        assert.strictEqual(aliceMap.get("register"), undefined);
        assert.strictEqual(aliceRegister!.value, 0);

        bobRegister!.add(5);
        runtimeGen.releaseAll();
        assert.deepStrictEqual(new Set(aliceMap.keys()), new Set(["register"]));
        assert.deepStrictEqual(new Set(bobMap.keys()), new Set(["register"]));
        assert.strictEqual(bobRegister!.value, 5);
        assert.strictEqual(aliceRegister, aliceMap.get("register"));
        assert.strictEqual(aliceRegister!.value, 5);
      });

      it("lets causally later op survive", () => {
        bobMap.reset();
        bobRegister.add(7);
        runtimeGen.releaseAll();
        assert.deepStrictEqual(new Set(aliceMap.keys()), new Set(["register"]));
        assert.deepStrictEqual(new Set(bobMap.keys()), new Set(["register"]));
        assert.strictEqual(bobRegister.value, 7);
        assert.strictEqual(aliceRegister, aliceMap.get("register"));
        assert.strictEqual(aliceRegister.value, 7);
      });
    });

    describe("value CRDT", () => {
      it("can be used as values in other CRDTs", () => {
        let aliceCounter = aliceMap.getForce("test");
        let bobCounter = bobMap.getForce("test");
        runtimeGen.releaseAll();

        let aliceSet = alice.groupParent("").addChild("valueSet", new GSet());
        let bobSet = bob.groupParent("").addChild("valueSet", new GSet());

        aliceSet.add(aliceCounter);
        assert.strictEqual(aliceSet.has(aliceCounter), true);
        runtimeGen.releaseAll();
        assert.strictEqual(bobSet.has(bobCounter), true);
      });
    });
  });

  // TODO
  // describe("RuntimeCrdtGenerator", () => {
  //   let aliceGen: RuntimeCrdtGenerator<Number>;
  //   let bobGen: RuntimeCrdtGenerator<Number>;
  //   let aliceCounter: Number;
  //   let bobCounter: Number;
  //
  //   beforeEach(() => {
  //     const generator = (parent: Crdt, id: string, _: Uint8Array) =>
  //       new Number(parent, id);
  //     aliceGen = new RuntimeCrdtGenerator(alice, "gen", generator);
  //     bobGen = new RuntimeCrdtGenerator(bob, "gen", generator);
  //     aliceCounter = aliceGen.generate(new Uint8Array());
  //     bobGen.on("NewCrdt", (event) => (bobCounter = event.newCrdt));
  //   });
  //
  //   describe("generate", () => {
  //     it("generates CRDTs that work", () => {
  //       aliceCounter.add(7);
  //       runtimeGen.releaseAll();
  //       assert.strictEqual(aliceCounter.value, 7);
  //       assert.isNotNull(bobCounter);
  //       assert.strictEqual(bobCounter.value, 7);
  //     });
  //   });
  // });

  describe("LwwMap", () => {
    let aliceMap: LwwMap<string, number>;
    let bobMap: LwwMap<string, number>;

    beforeEach(() => {
      aliceMap = alice.groupParent("").addChild("lwwMap", new LwwMap());
      bobMap = bob.groupParent("").addChild("lwwMap", new LwwMap());
      if (debug) {
        addEventListeners(aliceMap, "Alice");
        addEventListeners(bobMap, "Bob");
      }
    });

    function addEventListeners<K, V extends Object | null>(
      map: LwwMap<any, any>,
      name: string
    ): void {
      // TODO: add listeners
    }

    it("is initially empty", () => {
      assert.deepStrictEqual(new Set(aliceMap.keys()), new Set([]));
      assert.deepStrictEqual(new Set(bobMap.keys()), new Set([]));
      assert.deepStrictEqual(new Set(aliceMap.values()), new Set([]));
      assert.deepStrictEqual(new Set(bobMap.values()), new Set([]));
      assert.deepStrictEqual(new Set(aliceMap.entries()), new Set([]));
      assert.deepStrictEqual(new Set(bobMap.entries()), new Set([]));
    });

    describe("addKey", () => {
      it("works with non-concurrent updates", () => {
        aliceMap.set("test", 7);
        runtimeGen.releaseAll();
        assert.deepStrictEqual(new Set(aliceMap.keys()), new Set(["test"]));
        assert.deepStrictEqual(new Set(bobMap.keys()), new Set(["test"]));
        assert.deepStrictEqual(new Set(aliceMap.values()), new Set([7]));
        assert.deepStrictEqual(new Set(bobMap.values()), new Set([7]));
        assert.deepStrictEqual(
          new Set(aliceMap.entries()),
          new Set([["test", 7]])
        );
        assert.deepStrictEqual(
          new Set(bobMap.entries()),
          new Set([["test", 7]])
        );
      });
      it("emits right events", async () => {
        const promise = Promise.all([
          aliceMap.nextEvent("ValueChange"),
          bobMap.nextEvent("ValueChange"),
        ]);
        // function checkKeyAdd(event: KeyEvent<string>) {
        //   assert.strictEqual(event.key, "test");
        //   // TODO: this depends on the value getting through,
        //   // but it isn't set until after the add.
        //   // Will work once events are async.
        //   //assert.strictEqual(event.value, 7);
        // }
        // aliceMap.on("KeyAdd", checkKeyAdd);
        // bobMap.on("KeyAdd", checkKeyAdd);
        function checkValueChange(event: MapEvent<string, number>) {
          assert.strictEqual(event.key, "test");
          assert.strictEqual(event.value, 7);
        }
        aliceMap.on("ValueChange", checkValueChange);
        bobMap.on("ValueChange", checkValueChange);
        aliceMap.on("KeyDelete", () =>
          assert.fail("Did not expect KeyDelete event from Alice")
        );
        bobMap.on("KeyDelete", () => {
          assert.fail("Did not expect KeyDelete event from Bob");
        });

        aliceMap.set("test", 7);
        runtimeGen.releaseAll();

        await promise;
      });
    });

    describe("has", () => {
      it("returns true if the key is in the map", () => {
        aliceMap.set("test", 7);
        assert.isTrue(aliceMap.has("test"));
        assert.isFalse(bobMap.has("test"));

        runtimeGen.releaseAll();
        assert.isTrue(aliceMap.has("test"));
        assert.isTrue(bobMap.has("test"));
      });

      it("returns false if the key is not in the map", () => {
        aliceMap.set("test", 7);
        assert.isFalse(aliceMap.has("not in map"));
        assert.isFalse(bobMap.has("not in map"));

        runtimeGen.releaseAll();
        assert.isFalse(aliceMap.has("not in map"));
        assert.isFalse(bobMap.has("not in map"));
      });
    });

    describe("get", () => {
      it("returns the value if the key is in the map", () => {
        aliceMap.set("test", 7);
        runtimeGen.releaseAll();
        assert.strictEqual(aliceMap.get("test"), 7);
        assert.strictEqual(bobMap.get("test"), 7);
      });

      it("returns undefined if the key is not in the map", () => {
        aliceMap.set("test", 7);
        runtimeGen.releaseAll();
        assert.isUndefined(aliceMap.get("not in map"));
        assert.isUndefined(bobMap.get("not in map"));
      });
    });

    describe("delete", () => {
      it("deletes existing elements", () => {
        bobMap.set("test", 7);
        runtimeGen.releaseAll();
        assert.deepStrictEqual(new Set(aliceMap.keys()), new Set(["test"]));

        bobMap.delete("test");
        runtimeGen.releaseAll();
        assert.deepStrictEqual(new Set(aliceMap.keys()), new Set([]));
        assert.deepStrictEqual(new Set(bobMap.keys()), new Set([]));
        assert.deepStrictEqual(new Set(aliceMap.values()), new Set([]));
        assert.deepStrictEqual(new Set(bobMap.values()), new Set([]));
        assert.deepStrictEqual(new Set(aliceMap.entries()), new Set([]));
        assert.deepStrictEqual(new Set(bobMap.entries()), new Set([]));
        assert.isUndefined(aliceMap.get("test"));
        assert.isUndefined(bobMap.get("test"));
      });

      it("does not delete non-existing elements", () => {
        bobMap.delete("test");
        runtimeGen.releaseAll();
        assert.deepStrictEqual(new Set(aliceMap.keys()), new Set([]));
        assert.deepStrictEqual(new Set(bobMap.keys()), new Set([]));
        assert.deepStrictEqual(new Set(aliceMap.values()), new Set([]));
        assert.deepStrictEqual(new Set(bobMap.values()), new Set([]));
        assert.deepStrictEqual(new Set(aliceMap.entries()), new Set([]));
        assert.deepStrictEqual(new Set(bobMap.entries()), new Set([]));
        assert.isUndefined(aliceMap.get("test"));
        assert.isUndefined(bobMap.get("test"));
      });

      // TODO: for future observed-remove semantics,
      // this should no longer need the time interval
      it("lets later set survive", () => {
        aliceMap.set("register", 7);
        runtimeGen.releaseAll();
        assert.deepStrictEqual(new Set(aliceMap.keys()), new Set(["register"]));
        assert.deepStrictEqual(new Set(bobMap.keys()), new Set(["register"]));

        assert.strictEqual(bobMap.get("register"), 7);

        aliceMap.delete("register");
        let now = new Date().getTime();
        while (new Date().getTime() <= now) {
          // Loop; Bob will have a later time than now
        }
        bobMap.set("register", 3);
        runtimeGen.releaseAll();
        assert.deepStrictEqual(new Set(aliceMap.keys()), new Set(["register"]));
        assert.deepStrictEqual(new Set(bobMap.keys()), new Set(["register"]));
        assert.strictEqual(bobMap.get("register"), 3);
        assert.strictEqual(aliceMap.get("register"), 3);
      });

      it("emits right events", async () => {
        aliceMap.set("test", 7);
        runtimeGen.releaseAll();

        const promise = Promise.all([
          aliceMap.nextEvent("KeyDelete"),
          bobMap.nextEvent("KeyDelete"),
        ]);
        function checkKeyDelete(event: KeyEvent<string>) {
          assert.strictEqual(event.key, "test");
          // TODO: this depends on the value getting through,
          // but it isn't set until after the add.
          // Will work once events are async.
          //assert.strictEqual(event.value, 7);
        }
        aliceMap.on("KeyDelete", checkKeyDelete);
        bobMap.on("KeyDelete", checkKeyDelete);
        aliceMap.on("ValueChange", () =>
          assert.fail("Did not expect ValueChange event from Alice")
        );
        bobMap.on("ValueChange", () => {
          assert.fail("Did not expect ValueChange event from Bob");
        });
        // aliceMap.on("KeyAdd", () =>
        //   assert.fail("Did not expect KeyAdd event from Alice")
        // );
        // bobMap.on("KeyAdd", () => {
        //   assert.fail("Did not expect KeyAdd event from Bob");
        // });

        aliceMap.delete("test");
        runtimeGen.releaseAll();

        await promise;
      });
    });
    describe("gc", () => {
      it("garbage collects deleted entries", async () => {
        for (let i = 0; i < 100; i++) {
          aliceMap.set(i + "", 10 * i);
        }
        runtimeGen.releaseAll();
        for (let i = 0; i < 100; i++) {
          if (i < 50) aliceMap.delete(i + "");
          else bobMap.delete(i + "");
        }
        runtimeGen.releaseAll();
        await new Promise((resolve) => setTimeout(resolve, 10));
        // @ts-ignore internalMap is private
        assert.strictEqual(aliceMap.internalMap.explicitSize, 0);
        // @ts-ignore internalMap is private
        assert.strictEqual(bobMap.internalMap.explicitSize, 0);
      });

      it("does not garbage collect non-deleted entries", async () => {
        for (let i = 0; i < 100; i++) {
          aliceMap.set(i + "", 10 * i);
        }
        runtimeGen.releaseAll();
        // Check nothing has happened synchronously
        assert.strictEqual(aliceMap.size, 100);
        assert.strictEqual(bobMap.size, 100);
        // @ts-ignore internalMap is private
        assert.strictEqual(aliceMap.internalMap.explicitSize, 100);
        // @ts-ignore internalMap is private
        assert.strictEqual(bobMap.internalMap.explicitSize, 100);

        // Wait for GC to actually run
        await new Promise((resolve) => setTimeout(resolve, 10));
        assert.strictEqual(aliceMap.size, 100);
        assert.strictEqual(bobMap.size, 100);
        // @ts-ignore internalMap is private
        assert.strictEqual(aliceMap.internalMap.explicitSize, 100);
        // @ts-ignore internalMap is private
        assert.strictEqual(bobMap.internalMap.explicitSize, 100);
      });

      it("does not garbage collect synchronously", async () => {
        for (let i = 0; i < 100; i++) {
          aliceMap.set(i + "", 10 * i);
        }
        runtimeGen.releaseAll();
        for (let i = 0; i < 100; i++) {
          if (i < 50) aliceMap.delete(i + "");
          else bobMap.delete(i + "");
        }
        runtimeGen.releaseAll();

        // Don't wait for GC to run; it shouldn't GC yet
        assert.strictEqual(aliceMap.size, 0);
        assert.strictEqual(bobMap.size, 0);
        // @ts-ignore internalMap is private
        assert.strictEqual(aliceMap.internalMap.explicitSize, 100);
        // @ts-ignore internalMap is private
        assert.strictEqual(bobMap.internalMap.explicitSize, 100);
      });
    });
  });

  describe("JsonCrdt", () => {
    let aliceJson: JsonCrdt;
    let aliceCursor: JsonCursor;
    let bobJson: JsonCrdt;
    let bobCursor: JsonCursor;

    beforeEach(() => {
      let aliceCrdt = new JsonCrdt();
      let bobCrdt = new JsonCrdt();
      aliceCursor = new JsonCursor(aliceCrdt);
      bobCursor = new JsonCursor(bobCrdt);
      aliceJson = alice.groupParent("").addChild("cursor", aliceCrdt);
      bobJson = bob.groupParent("").addChild("cursor", bobCrdt);
    });

    it("is initially empty", () => {
      assert.isEmpty(aliceCursor.keys());
      assert.isEmpty(bobCursor.keys());
      assert.isEmpty(aliceCursor.values());
      assert.isEmpty(bobCursor.values());
    });

    describe("add non-nested objects", () => {
      it("works with non-concurrent updates", () => {
        aliceCursor.set("test", 9);
        runtimeGen.releaseAll();
        assert.deepStrictEqual(aliceCursor.keys(), ["test"]);
        assert.deepStrictEqual(aliceCursor.values(), [9]);
        assert.deepStrictEqual(bobCursor.keys(), ["test"]);
        assert.deepStrictEqual(bobCursor.values(), [9]);
      });

      it("works with concurrent updates", () => {
        aliceCursor.set("test", 9);
        bobCursor.set("test", "testString");
        runtimeGen.releaseAll();
        assert.deepStrictEqual(aliceCursor.keys(), ["test"]);
        assert.deepStrictEqual(
          new Set(aliceCursor.get("test")),
          new Set([9, "testString"])
        );
        assert.deepStrictEqual(bobCursor.keys(), ["test"]);
        assert.deepStrictEqual(
          new Set(bobCursor.get("test")),
          new Set([9, "testString"])
        );

        bobCursor.set("test", 10);
        runtimeGen.releaseAll();
        assert.deepStrictEqual(aliceCursor.keys(), ["test"]);
        assert.deepStrictEqual(aliceCursor.get("test"), [10]);
        assert.deepStrictEqual(bobCursor.keys(), ["test"]);
        assert.deepStrictEqual(bobCursor.get("test"), [10]);
      });
    });

    describe("add nested objects", () => {
      it("works with non-concurrent updates", () => {
        bobCursor.setIsMap("testNested");
        runtimeGen.releaseAll();

        assert.lengthOf(aliceCursor.get("testNested"), 1);
        assert.lengthOf(bobCursor.get("testNested"), 1);
        assert.typeOf(aliceCursor.get("testNested")[0], "object");
        assert.typeOf(bobCursor.get("testNested")[0], "object");

        let aliceCursorNested = aliceCursor.get("testNested")[0] as JsonCursor;
        let bobCursorNested = bobCursor.get("testNested")[0] as JsonCursor;
        assert.deepStrictEqual(aliceCursorNested.keys(), []);
        assert.deepStrictEqual(bobCursorNested.keys(), []);

        aliceCursorNested.set("nestedVal", 20);
        runtimeGen.releaseAll();

        assert.deepStrictEqual(aliceCursorNested.keys(), ["nestedVal"]);
        assert.deepStrictEqual(aliceCursorNested.values(), [20]);
        assert.deepStrictEqual(bobCursorNested.keys(), ["nestedVal"]);
        assert.deepStrictEqual(bobCursorNested.values(), [20]);
      });

      it("works with concurrent updates", () => {
        aliceCursor.set("testNested", 7);
        bobCursor.setIsMap("testNested");
        runtimeGen.releaseAll();

        assert.lengthOf(aliceCursor.get("testNested"), 2);
        assert.lengthOf(bobCursor.get("testNested"), 2);

        aliceCursor.setIsMap("testNested");
        runtimeGen.releaseAll();

        assert.lengthOf(aliceCursor.get("testNested"), 1);
        assert.lengthOf(bobCursor.get("testNested"), 1);
        assert.typeOf(aliceCursor.get("testNested")[0], "object");
        assert.typeOf(bobCursor.get("testNested")[0], "object");

        let aliceCursorNested = aliceCursor.get("testNested")[0] as JsonCursor;
        let bobCursorNested = bobCursor.get("testNested")[0] as JsonCursor;
        assert.deepStrictEqual(aliceCursorNested.keys(), []);
        assert.deepStrictEqual(bobCursorNested.keys(), []);

        aliceCursorNested.set("nestedValNum", 20);
        bobCursorNested.set("nestedValString", "string");
        runtimeGen.releaseAll();

        assert.deepStrictEqual(
          new Set(aliceCursorNested.keys()),
          new Set(["nestedValNum", "nestedValString"])
        );
        assert.deepStrictEqual(aliceCursorNested.get("nestedValNum"), [20]);
        assert.deepStrictEqual(aliceCursorNested.get("nestedValString"), [
          "string",
        ]);
        assert.deepStrictEqual(
          new Set(aliceCursorNested.values()),
          new Set([20, "string"])
        );
        assert.deepStrictEqual(
          new Set(bobCursorNested.keys()),
          new Set(["nestedValNum", "nestedValString"])
        );
        assert.deepStrictEqual(bobCursorNested.get("nestedValNum"), [20]);
        assert.deepStrictEqual(bobCursorNested.get("nestedValString"), [
          "string",
        ]);
        assert.deepStrictEqual(
          new Set(bobCursorNested.values()),
          new Set([20, "string"])
        );

        // Test that keys only returns keys for top level of Json object
        assert.deepStrictEqual(aliceCursor.keys(), ["testNested"]);
        assert.deepStrictEqual(bobCursor.keys(), ["testNested"]);
      });
    });

    describe("delete non-nested objects", () => {
      it("works with non-concurrent updates", () => {
        aliceCursor.set("test", 9);
        runtimeGen.releaseAll();

        bobCursor.delete("test");
        runtimeGen.releaseAll();
        assert.deepStrictEqual(aliceCursor.get("test"), []);
        assert.deepStrictEqual(bobCursor.get("test"), []);
      });

      it("works with concurrent updates", () => {
        aliceCursor.set("testNum", 9);
        bobCursor.set("testStr", "string");
        runtimeGen.releaseAll();

        aliceCursor.delete("testStr");
        bobCursor.set("testNum", 10);
        runtimeGen.releaseAll();
        assert.deepStrictEqual(aliceCursor.keys(), ["testNum"]);
        assert.deepStrictEqual(aliceCursor.get("testNum"), [10]);
        assert.deepStrictEqual(bobCursor.keys(), ["testNum"]);
        assert.deepStrictEqual(bobCursor.get("testNum"), [10]);
      });
    });

    describe("delete nested objects", () => {
      it("works with non-concurrent updates", () => {
        bobCursor.setIsMap("testNested");
        runtimeGen.releaseAll();

        let aliceCursorNested = aliceCursor.get("testNested")[0] as JsonCursor;
        let bobCursorNested = bobCursor.get("testNested")[0] as JsonCursor;

        aliceCursorNested.set("nestedVal", 20);
        runtimeGen.releaseAll();

        bobCursor.set("non-nested", "string");
        bobCursor.delete("testNested");
        runtimeGen.releaseAll();

        assert.deepStrictEqual(aliceCursorNested.keys(), []);
        assert.deepStrictEqual(aliceCursorNested.values(), []);
        assert.deepStrictEqual(bobCursorNested.keys(), []);
        assert.deepStrictEqual(bobCursorNested.values(), []);

        assert.deepStrictEqual(aliceCursor.keys(), ["non-nested"]);
        assert.deepStrictEqual(aliceCursor.values(), ["string"]);
        assert.deepStrictEqual(bobCursor.keys(), ["non-nested"]);
        assert.deepStrictEqual(bobCursor.values(), ["string"]);
      });

      it("works with concurrent updates", () => {
        aliceCursor.setIsMap("testNested");
        bobCursor.set("non-nested", 16);
        runtimeGen.releaseAll();

        assert.deepStrictEqual(
          new Set(aliceCursor.keys()),
          new Set(["testNested", "non-nested"])
        );
        assert.includeDeepMembers(aliceCursor.values(), [16]);
        assert.deepStrictEqual(
          new Set(bobCursor.keys()),
          new Set(["testNested", "non-nested"])
        );
        assert.includeDeepMembers(bobCursor.values(), [16]);

        let aliceCursorNested = aliceCursor.get("testNested")[0] as JsonCursor;
        let bobCursorNested = bobCursor.get("testNested")[0] as JsonCursor;

        bobCursorNested.set("nestedValString", "string");
        runtimeGen.releaseAll();

        aliceCursorNested.set("nestedValNum", 20);
        bobCursor.delete("testNested");
        runtimeGen.releaseAll();

        assert.deepStrictEqual(aliceCursorNested.keys(), ["nestedValNum"]);
        assert.deepStrictEqual(aliceCursorNested.values(), [20]);
        assert.deepStrictEqual(bobCursorNested.keys(), ["nestedValNum"]);
        assert.deepStrictEqual(bobCursorNested.values(), [20]);

        // Internally, 'testNested' -> {} is removed
        assert.deepStrictEqual(
          new Set(aliceCursor.keys()),
          new Set(["testNested", "non-nested"])
        );
        assert.deepStrictEqual(
          new Set(bobCursor.keys()),
          new Set(["testNested", "non-nested"])
        );
      });
    });
  });
});

//
// function testOrthogonal() {
//     console.log("testOrthogonal()...");
//
//     let aliceOrthogonal = new OrthogonalCrdt("orthogonalId", alice);
//     aliceOrthogonal.onchange = (event => console.log(
//         "Alice: " + event.timestamp.getSender() + " set to " +
//         event.description));
//     let bobOrthogonal = new OrthogonalCrdt("orthogonalId", bob);
//     bobOrthogonal.onchange = (event => console.log(
//         "Bob: " + event.timestamp.getSender() + " set to " +
//         event.description));
//     assert.deepStrictEqual(aliceOrthogonal.value, [0, false]);
//     assert.deepStrictEqual(bobOrthogonal.value, [0, false]);
//
//     aliceOrthogonal.rotate(1);
//     runtimeGen.releaseAll();
//     assert.deepStrictEqual(aliceOrthogonal.value, [1, false]);
//     assert.deepStrictEqual(bobOrthogonal.value, [1, false]);
//
//     aliceOrthogonal.rotate(10);
//     runtimeGen.releaseAll();
//     assert.deepStrictEqual(aliceOrthogonal.value, [11 % (2*Math.PI), false]);
//     assert.deepStrictEqual(bobOrthogonal.value, [11 % (2*Math.PI), false]);
//     aliceOrthogonal.rotate(-10);
//     runtimeGen.releaseAll();
//
//     bobOrthogonal.reflectHorizontalAxis();
//     runtimeGen.releaseAll();
//     assert.deepStrictEqual(aliceOrthogonal.value, [2*Math.PI - 1, true]);
//     assert.deepStrictEqual(bobOrthogonal.value, [2*Math.PI - 1, true]);
//
//     aliceOrthogonal.rotate(1.5);
//     runtimeGen.releaseAll();
//     assert.deepStrictEqual(aliceOrthogonal.value, [0.5, true]);
//     assert.deepStrictEqual(bobOrthogonal.value, [0.5, true]);
//
//     bobOrthogonal.reflect(0.5);
//     runtimeGen.releaseAll();
//     assert.deepStrictEqual(aliceOrthogonal.value, [0.5, false]);
//     assert.deepStrictEqual(bobOrthogonal.value, [0.5, false]);
//
//     // Out of order tests
//     aliceOrthogonal.reset();
//     runtimeGen.releaseAll();
//     assert.deepStrictEqual(aliceOrthogonal.value, [0, false]);
//     assert.deepStrictEqual(bobOrthogonal.value, [0, false]);
//
//     aliceOrthogonal.rotate(Math.PI/2);
//     assert.deepStrictEqual(aliceOrthogonal.value, [Math.PI/2, false]);
//     assert.deepStrictEqual(bobOrthogonal.value, [0, false]);
//
//     bobOrthogonal.reflectHorizontalAxis();
//     assert.deepStrictEqual(aliceOrthogonal.value, [Math.PI/2, false]);
//     assert.deepStrictEqual(bobOrthogonal.value, [0, true]);
//
//     runtimeGen.releaseAll();
//     assert.deepStrictEqual(aliceOrthogonal.value, [3*Math.PI/2, true]);
//     assert.deepStrictEqual(bobOrthogonal.value, [3*Math.PI/2, true]);
//     console.log("...ok");
// }
//
