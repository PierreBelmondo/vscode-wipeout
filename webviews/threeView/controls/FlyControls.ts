import * as THREE from "three";

const CHANGE_EVENT = { type: "change" };

function contextmenu(event) {
  event.preventDefault();
}

export class FlyControls extends THREE.EventDispatcher {
  object: THREE.Camera;
  domElement: Document | HTMLElement = document;
  domWindow: Window = window;

  readonly EPS = 0.000001;
  readonly lastQuaternion = new THREE.Quaternion();
  readonly lastPosition = new THREE.Vector3();

  private movementSpeed = 1.0;
  private rollSpeed = 0.005;
  private dragToLook = false;
  private autoForward = false; // disable default target object behavior
  private tmpQuaternion = new THREE.Quaternion();
  private mouseStatus = 0;
  private moveState = {
    up: 0,
    down: 0,
    left: 0,
    right: 0,
    forward: 0,
    back: 0,
    pitchUp: 0,
    pitchDown: 0,
    yawLeft: 0,
    yawRight: 0,
    rollLeft: 0,
    rollRight: 0,
  };
  private moveVector = new THREE.Vector3(0, 0, 0);
  private rotationVector = new THREE.Vector3(0, 0, 0);

  private readonly _mousemove = this.mousemove.bind(this);
  private readonly _mousedown = this.mousedown.bind(this);
  private readonly _mouseup = this.mouseup.bind(this);
  private readonly _keydown = this.keydown.bind(this);
  private readonly _keyup = this.keyup.bind(this);

  constructor(
    object: THREE.Camera,
    domElement?: Document | HTMLElement,
    domWindow?: Window
  ) {
    super();
    this.object = object;

    if (domElement) this.domElement = domElement;
    if (domWindow) this.domWindow = domWindow;

    this.movementSpeed = 1.0;
    this.rollSpeed = 0.005;
    this.dragToLook = false;
    this.autoForward = false; // disable default target object behavior

    this.domElement.addEventListener("contextmenu", contextmenu);
    this.domElement.addEventListener("mousemove", this._mousemove);
    this.domElement.addEventListener("mousedown", this._mousedown);
    this.domElement.addEventListener("mouseup", this._mouseup);
    this.domWindow.addEventListener("keydown", this._keydown);
    this.domWindow.addEventListener("keyup", this._keyup);

    this.updateMovementVector();
    this.updateRotationVector();
  }

  dispose() {
    this.domElement.removeEventListener("contextmenu", contextmenu, false);
    this.domElement.removeEventListener("mousedown", this._mousedown, false);
    this.domElement.removeEventListener("mousemove", this._mousemove, false);
    this.domElement.removeEventListener("mouseup", this._mouseup, false);
    this.domWindow.removeEventListener("keydown", this._keydown, false);
    this.domWindow.removeEventListener("keyup", this._keyup, false);
  }

  private keydown(event: KeyboardEvent) {
    if (event.altKey) {
      return;
    }

    switch (event.code) {
      case "ShiftLeft":
      case "ShiftRight":
        this.movementSpeed = 0.1;
        break;
      case "KeyW":
        this.moveState.forward = 1;
        break;
      case "KeyS":
        this.moveState.back = 1;
        break;
      case "KeyA":
        this.moveState.left = 1;
        break;
      case "KeyD":
        this.moveState.right = 1;
        break;
      case "KeyR":
        this.moveState.up = 1;
        break;
      case "KeyF":
        this.moveState.down = 1;
        break;
      case "ArrowUp":
        this.moveState.pitchUp = 1;
        break;
      case "ArrowDown":
        this.moveState.pitchDown = 1;
        break;
      case "ArrowLeft":
        this.moveState.yawLeft = 1;
        break;
      case "ArrowRight":
        this.moveState.yawRight = 1;
        break;
      case "KeyQ":
        this.moveState.rollLeft = 1;
        break;
      case "KeyE":
        this.moveState.rollRight = 1;
        break;
    }
    this.updateMovementVector();
    this.updateRotationVector();
  }

  private keyup(event: KeyboardEvent) {
    switch (event.code) {
      case "ShiftLeft":
      case "ShiftRight":
        this.movementSpeed = 1;
        break;
      case "KeyW":
        this.moveState.forward = 0;
        break;
      case "KeyS":
        this.moveState.back = 0;
        break;
      case "KeyA":
        this.moveState.left = 0;
        break;
      case "KeyD":
        this.moveState.right = 0;
        break;
      case "KeyR":
        this.moveState.up = 0;
        break;
      case "KeyF":
        this.moveState.down = 0;
        break;
      case "ArrowUp":
        this.moveState.pitchUp = 0;
        break;
      case "ArrowDown":
        this.moveState.pitchDown = 0;
        break;
      case "ArrowLeft":
        this.moveState.yawLeft = 0;
        break;
      case "ArrowRight":
        this.moveState.yawRight = 0;
        break;
      case "KeyQ":
        this.moveState.rollLeft = 0;
        break;
      case "KeyE":
        this.moveState.rollRight = 0;
        break;
    }
    this.updateMovementVector();
    this.updateRotationVector();
  }

  private mousedown(event: MouseEvent) {
    if (this.dragToLook) {
      this.mouseStatus++;
    } else {
      switch (event.button) {
        case 0:
          this.moveState.forward = 1;
          break;
        case 2:
          this.moveState.back = 1;
          break;
      }
      this.updateMovementVector();
    }
  }

  private mousemove(event: MouseEvent) {
    if (!this.dragToLook || this.mouseStatus > 0) {
      const container = this.getContainerDimensions();
      const halfWidth = container.size[0] / 2;
      const halfHeight = container.size[1] / 2;
      this.moveState.yawLeft =
        -(event.pageX - container.offset[0] - halfWidth) / halfWidth;
      this.moveState.pitchDown =
        (event.pageY - container.offset[1] - halfHeight) / halfHeight;
      this.updateRotationVector();
    }
  }

  private mouseup(event: MouseEvent) {
    if (this.dragToLook) {
      this.mouseStatus--;
      this.moveState.yawLeft = this.moveState.pitchDown = 0;
    } else {
      switch (event.button) {
        case 0:
          this.moveState.forward = 0;
          break;
        case 2:
          this.moveState.back = 0;
          break;
      }
      this.updateMovementVector();
    }
    this.updateRotationVector();
  }

  update(delta) {
    const moveMult = delta * this.movementSpeed;
    const rotMult = delta * this.rollSpeed;
    this.object.translateX(this.moveVector.x * moveMult);
    this.object.translateY(this.moveVector.y * moveMult);
    this.object.translateZ(this.moveVector.z * moveMult);
    this.tmpQuaternion
      .set(
        this.rotationVector.x * rotMult,
        this.rotationVector.y * rotMult,
        this.rotationVector.z * rotMult,
        1
      )
      .normalize();
    this.object.quaternion.multiply(this.tmpQuaternion);

    if (
      this.lastPosition.distanceToSquared(this.object.position) > this.EPS ||
      8 * (1 - this.lastQuaternion.dot(this.object.quaternion)) > this.EPS
    ) {
      this.dispatchEvent(CHANGE_EVENT);
      this.lastQuaternion.copy(this.object.quaternion);
      this.lastPosition.copy(this.object.position);
    }
  }

  updateMovementVector() {
    const forward =
      this.moveState.forward || (this.autoForward && !this.moveState.back)
        ? 1
        : 0;
    this.moveVector.x = -this.moveState.left + this.moveState.right;
    this.moveVector.y = -this.moveState.down + this.moveState.up;
    this.moveVector.z = -forward + this.moveState.back; //console.log( 'move:', [ this.moveVector.x, this.moveVector.y, this.moveVector.z ] );
  }

  updateRotationVector() {
    this.rotationVector.x = -this.moveState.pitchDown + this.moveState.pitchUp;
    this.rotationVector.y = -this.moveState.yawRight + this.moveState.yawLeft;
    this.rotationVector.z = -this.moveState.rollRight + this.moveState.rollLeft; //console.log( 'rotate:', [ this.rotationVector.x, this.rotationVector.y, this.rotationVector.z ] );
  }

  getContainerDimensions() {
    /*
      if (this.domElement != document) {
        return {
          size: [this.domElement.offsetWidth, this.domElement.offsetHeight],
          offset: [this.domElement.offsetLeft, this.domElement.offsetTop],
        };
      } else*/ {
      return {
        size: [window.innerWidth, window.innerHeight],
        offset: [0, 0],
      };
    }
  }
}
