interface VsCodeApi {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
}

declare var acquireVsCodeApi: () => VsCodeApi;

const _vsCodeApi = acquireVsCodeApi();

export function postMessage(message: any): void {
  _vsCodeApi.postMessage(message);
}

export function getState(): any {
  return _vsCodeApi.getState();
}

export function setState(state: any): void {
  _vsCodeApi.setState(state);
}
