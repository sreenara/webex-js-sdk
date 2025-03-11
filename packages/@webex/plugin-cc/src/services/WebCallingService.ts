import EventEmitter from 'events';
import {
  createClient,
  ICall,
  ICallingClient,
  ILine,
  LINE_EVENTS,
  ServiceIndicator,
  LocalMicrophoneStream,
  CALL_EVENT_KEYS,
  LOGGER,
} from '@webex/calling';
import {LoginOption, WebexSDK} from '../types';
import {TIMEOUT_DURATION, WEB_CALLING_SERVICE_FILE} from '../constants';
import LoggerProxy from '../logger-proxy';
import {DEFAULT_RTMS_DOMAIN, POST_AUTH, WCC_CALLING_RTMS_DOMAIN} from './constants';

export default class WebCallingService extends EventEmitter {
  private callingClient: ICallingClient;
  private line: ILine;
  private call: ICall | undefined;
  private webex: WebexSDK;
  public loginOption: LoginOption;
  private callTaskMap: Map<string, string>;

  constructor(webex: WebexSDK) {
    super();
    this.webex = webex;
    this.callTaskMap = new Map();
  }

  public setLoginOption(loginOption: LoginOption) {
    this.loginOption = loginOption;
  }

  private handleMediaEvent = (track: MediaStreamTrack) => {
    this.emit(CALL_EVENT_KEYS.REMOTE_MEDIA, track);
  };

  private handleDisconnectEvent = () => {
    this.call.end();
    this.cleanUpCall();
  };

  private registerCallListeners() {
    // TODO: Add remaining call listeners here
    this.call.on(CALL_EVENT_KEYS.REMOTE_MEDIA, this.handleMediaEvent);
    this.call.on(CALL_EVENT_KEYS.DISCONNECT, this.handleDisconnectEvent);
  }

  public cleanUpCall() {
    if (this.call) {
      this.call.off(CALL_EVENT_KEYS.REMOTE_MEDIA, this.handleMediaEvent);
      this.call.off(CALL_EVENT_KEYS.DISCONNECT, this.handleDisconnectEvent);
      const callId = this.call.getCallId();
      const taskId = this.getTaskIdForCall(callId);

      if (taskId) {
        this.callTaskMap.delete(callId);
      }
      this.call = null;
    }
  }

  private async getRTMSDomain() {
    await this.webex.internal.services.waitForCatalog(POST_AUTH);

    const rtmsURL = this.webex.internal.services.get(WCC_CALLING_RTMS_DOMAIN);

    try {
      const url = new URL(rtmsURL);

      return url.hostname;
    } catch (error) {
      LoggerProxy.error(
        `Invalid URL from u2c catalogue: ${rtmsURL} so falling back to default domain`,
        {
          module: WEB_CALLING_SERVICE_FILE,
        }
      );

      return DEFAULT_RTMS_DOMAIN;
    }
  }

  public async registerWebCallingLine(): Promise<void> {
    const rtmsDomain = await this.getRTMSDomain(); // get the RTMS domain from the u2c catalogue

    const callingClientConfig = {
      logger: {
        level: LOGGER.INFO,
      },
      serviceData: {
        indicator: ServiceIndicator.CONTACT_CENTER,
        domain: rtmsDomain,
      },
    };

    this.callingClient = await createClient(this.webex as any, callingClientConfig);
    this.line = Object.values(this.callingClient.getLines())[0];

    this.line.on(LINE_EVENTS.UNREGISTERED, () => {
      LoggerProxy.log(`WxCC-SDK: Desktop unregistered successfully`, {
        module: WEB_CALLING_SERVICE_FILE,
        method: this.registerWebCallingLine.name,
      });
    });

    // Start listening for incoming calls
    this.line.on(LINE_EVENTS.INCOMING_CALL, (call: ICall) => {
      this.call = call;
      this.emit(LINE_EVENTS.INCOMING_CALL, call);
    });

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebCallingService Registration timed out'));
      }, TIMEOUT_DURATION);

      this.line.on(LINE_EVENTS.REGISTERED, (deviceInfo: ILine) => {
        clearTimeout(timeout);
        LoggerProxy.log(
          `WxCC-SDK: Desktop registered successfully, mobiusDeviceId: ${deviceInfo.mobiusDeviceId}`,
          {module: WEB_CALLING_SERVICE_FILE, method: this.registerWebCallingLine.name}
        );
        resolve();
      });
      this.line.register();
    });
  }

  public async deregisterWebCallingLine() {
    this.line?.deregister();
  }

  public answerCall(localAudioStream: LocalMicrophoneStream, taskId: string) {
    if (this.call) {
      try {
        this.webex.logger.info(`Call answered: ${taskId}`);
        this.call.answer(localAudioStream);
        this.registerCallListeners();
      } catch (error) {
        this.webex.logger.error(`Failed to answer call for ${taskId}. Error: ${error}`);
        // Optionally, throw the error to allow the invoker to handle it
        throw error;
      }
    } else {
      this.webex.logger.log(`Cannot answer a non WebRtc Call: ${taskId}`);
    }
  }

  public muteUnmuteCall(localAudioStream: LocalMicrophoneStream) {
    if (this.call) {
      this.webex.logger.info('Call mute or unmute requested!');
      this.call.mute(localAudioStream);
    } else {
      this.webex.logger.log(`Cannot mute a non WebRtc Call`);
    }
  }

  public isCallMuted() {
    if (this.call) {
      return this.call.isMuted();
    }

    return false;
  }

  public declineCall(taskId: string) {
    if (this.call) {
      try {
        this.webex.logger.info(`Call end requested: ${taskId}`);
        this.call.end();
        this.cleanUpCall();
      } catch (error) {
        this.webex.logger.error(`Failed to end call: ${taskId}. Error: ${error}`);
        // Optionally, throw the error to allow the invoker to handle it
        throw error;
      }
    } else {
      this.webex.logger.log(`Cannot end a non WebRtc Call: ${taskId}`);
    }
  }

  public mapCallToTask(callId: string, taskId: string) {
    this.callTaskMap.set(callId, taskId);
  }

  public getTaskIdForCall(callId: string): string | undefined {
    return this.callTaskMap.get(callId);
  }
}
