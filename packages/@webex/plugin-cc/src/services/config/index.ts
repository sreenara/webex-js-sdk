import {HTTP_METHODS} from '../../types';
import LoggerProxy from '../../logger-proxy';
import {
  DesktopProfileResponse,
  ListAuxCodesResponse,
  AgentResponse,
  OrgInfo,
  OrgSettings,
  TenantData,
  URLMapping,
  TeamList,
  DialPlanEntity,
  Profile,
  ListTeamsResponse,
  AuxCode,
} from './types';
import HttpRequest from '../core/HttpRequest';
import {WCC_API_GATEWAY} from '../constants';
import {CONFIG_FILE_NAME} from '../../constants';
import {parseAgentConfigs} from './Util';
import {
  DEFAULT_AUXCODE_ATTRIBUTES,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  DEFAULT_TEAM_ATTRIBUTES,
  endPointMap,
} from './constants';

/*
The AgentConfigService class provides methods to fetch agent configuration data.
*/
export default class AgentConfigService {
  private httpReq: HttpRequest;
  constructor() {
    this.httpReq = HttpRequest.getInstance();
  }

  /**
   * Fetches the agent configuration data for the given orgId and agentId.
   * @param {string} orgId
   * @param {string} agentId
   *  @returns {Promise<Profile>}
   */
  public async getAgentConfig(orgId: string, agentId: string): Promise<Profile> {
    try {
      const userConfigPromise = this.getUserUsingCI(orgId, agentId);
      const orgInfoPromise = this.getOrgInfo(orgId);
      const orgSettingsPromise = this.getOrganizationSetting(orgId);
      const tenantDataPromise = this.getTenantData(orgId);
      const urlMappingPromise = this.getURLMapping(orgId);
      const auxCodesPromise = this.getAllAuxCodes(
        orgId,
        DEFAULT_PAGE_SIZE,
        [],
        DEFAULT_AUXCODE_ATTRIBUTES
      );

      const userConfigData = await userConfigPromise;
      LoggerProxy.info('Fetched user data', {module: CONFIG_FILE_NAME, method: 'getAgentConfig'});

      const agentProfilePromise = this.getDesktopProfileById(orgId, userConfigData.agentProfileId);

      const userDialPlanPromise = agentProfilePromise.then((agentProfileConfigData) =>
        agentProfileConfigData.dialPlanEnabled ? this.getDialPlanData(orgId) : []
      );

      const userTeamPromise = userConfigData.teamIds
        ? this.getAllTeams(
            orgId,
            DEFAULT_PAGE_SIZE,
            userConfigData.teamIds,
            DEFAULT_TEAM_ATTRIBUTES
          )
        : Promise.resolve([]);

      const [
        agentProfileConfigData,
        userDialPlanData,
        userTeamData,
        orgInfo,
        orgSettingsData,
        tenantData,
        urlMappingData,
        auxCodesData,
      ] = await Promise.all([
        agentProfilePromise,
        userDialPlanPromise,
        userTeamPromise,
        orgInfoPromise,
        orgSettingsPromise,
        tenantDataPromise,
        urlMappingPromise,
        auxCodesPromise,
      ]);

      LoggerProxy.info('Fetched all required data', {
        module: CONFIG_FILE_NAME,
        method: 'getAgentConfig',
      });

      const response = parseAgentConfigs({
        userData: userConfigData,
        teamData: userTeamData,
        tenantData,
        orgInfoData: orgInfo,
        auxCodes: auxCodesData,
        orgSettingsData,
        agentProfileData: agentProfileConfigData,
        dialPlanData: userDialPlanData,
        urlMapping: urlMappingData,
      });

      // replace CONFIG_FILE_NAME with CONFIG_FILE_NAME
      LoggerProxy.info('Parsing completed for agent-config', {
        module: CONFIG_FILE_NAME,
        method: 'getAgentConfig',
      });
      LoggerProxy.info('Fetched configuration data successfully', {
        module: CONFIG_FILE_NAME,
        method: 'getAgentConfig',
      });

      return response;
    } catch (error) {
      LoggerProxy.error(`getAgentConfig call failed with ${error}`, {
        module: CONFIG_FILE_NAME,
        method: 'getAgentConfig',
      });
      throw error;
    }
  }

  /**
   * Fetches the agent configuration data for the given orgId and agentId.
   * @param {string} orgId
   * @param {string} agentId
   * @returns {Promise<AgentResponse>}
   */
  public async getUserUsingCI(orgId: string, agentId: string): Promise<AgentResponse> {
    try {
      const resource = endPointMap.userByCI(orgId, agentId);
      const response = await this.httpReq.request({
        service: WCC_API_GATEWAY,
        resource,
        method: HTTP_METHODS.GET,
      });

      if (response.statusCode !== 200) {
        throw new Error(`API call failed with ${response.statusCode}`);
      }

      LoggerProxy.log('getUserUsingCI api success.', {
        module: CONFIG_FILE_NAME,
        method: 'getUserUsingCI',
      });

      return Promise.resolve(response.body);
    } catch (error) {
      LoggerProxy.error(`getUserUsingCI API call failed with ${error}`, {
        module: CONFIG_FILE_NAME,
        method: 'getUserUsingCI',
      });
      throw error;
    }
  }

  /**
   * Fetches the desktop profile data for the given orgId and desktopProfileId.
   * @param {string} orgId
   * @param {string} desktopProfileId
   * @returns {Promise<DesktopProfileResponse>}
   */
  public async getDesktopProfileById(
    orgId: string,
    desktopProfileId: string
  ): Promise<DesktopProfileResponse> {
    try {
      const resource = endPointMap.desktopProfile(orgId, desktopProfileId);
      const response = await this.httpReq.request({
        service: WCC_API_GATEWAY,
        resource,
        method: HTTP_METHODS.GET,
      });

      if (response.statusCode !== 200) {
        throw new Error(`API call failed with ${response.statusCode}`);
      }

      LoggerProxy.log('getDesktopProfileById api success.', {
        module: CONFIG_FILE_NAME,
        method: 'getDesktopProfileById',
      });

      return Promise.resolve(response.body);
    } catch (error) {
      LoggerProxy.error(`getDesktopProfileById API call failed with ${error}`, {
        module: CONFIG_FILE_NAME,
        method: 'getDesktopProfileById',
      });
      throw error;
    }
  }

  /**
   * fetches the list of teams for the given orgId.
   * @param {string} orgId
   *  @param {number} page
   * @param {number} pageSize
   * @param {string[]} filter
   * @param {string[]} attributes
   * @returns {Promise<ListTeamsResponse>}
   */
  public async getListOfTeams(
    orgId: string,
    page: number,
    pageSize: number,
    filter: string[],
    attributes: string[]
  ): Promise<ListTeamsResponse> {
    try {
      const resource = endPointMap.listTeams(orgId, page, pageSize, filter, attributes);
      const response = await this.httpReq.request({
        service: WCC_API_GATEWAY,
        resource,
        method: HTTP_METHODS.GET,
      });

      if (response.statusCode !== 200) {
        throw new Error(`API call failed with ${response.statusCode}`);
      }

      LoggerProxy.log('getListOfTeams api success.', {
        module: CONFIG_FILE_NAME,
        method: 'getListOfTeams',
      });

      return Promise.resolve(response.body);
    } catch (error) {
      LoggerProxy.error(`getListOfTeams API call failed with ${error}`, {
        module: CONFIG_FILE_NAME,
        method: 'getListOfTeams',
      });
      throw error;
    }
  }

  /**
   * Fetches all teams from all pages for the given orgId
   * @param {string} orgId
   * @param {number} pageSize
   * @param {string[]} filter
   * @param {string[]} attributes
   * @returns {Promise<TeamList[]>}
   */
  public async getAllTeams(
    orgId: string,
    pageSize: number,
    filter: string[],
    attributes: string[]
  ): Promise<TeamList[]> {
    try {
      let allTeams: TeamList[] = [];
      let page = DEFAULT_PAGE;
      const firstResponse = await this.getListOfTeams(orgId, page, pageSize, filter, attributes);
      const totalPages = firstResponse.meta.totalPages;
      allTeams = allTeams.concat(firstResponse.data);
      const requests = [];
      for (page = DEFAULT_PAGE + 1; page < totalPages; page += 1) {
        requests.push(this.getListOfTeams(orgId, page, pageSize, filter, attributes));
      }
      const responses = await Promise.all(requests);

      for (const response of responses) {
        allTeams = allTeams.concat(response.data);
      }

      return allTeams;
    } catch (error) {
      LoggerProxy.error(`getAllTeams API call failed with ${error}`, {
        module: CONFIG_FILE_NAME,
        method: 'getAllTeams',
      });
      throw error;
    }
  }

  /**
   *   fetches the list of aux codes for the given orgId.
   * @param {string} orgId
   * @param {number} page
   * @param {number} pageSize
   * @param {string[]} filter
   * @param {string[]} attributes
   * @returns {Promise<ListAuxCodesResponse>}
   */
  public async getListOfAuxCodes(
    orgId: string,
    page: number,
    pageSize: number,
    filter: string[],
    attributes: string[]
  ): Promise<ListAuxCodesResponse> {
    try {
      const resource = endPointMap.listAuxCodes(orgId, page, pageSize, filter, attributes);
      const response = await this.httpReq.request({
        service: WCC_API_GATEWAY,
        resource,
        method: HTTP_METHODS.GET,
      });

      if (response.statusCode !== 200) {
        throw new Error(`API call failed with ${response.statusCode}`);
      }

      LoggerProxy.log('getListOfAuxCodes api success.', {
        module: CONFIG_FILE_NAME,
        method: 'getListOfAuxCodes',
      });

      return Promise.resolve(response.body);
    } catch (error) {
      LoggerProxy.error(`getListOfAuxCodes API call failed with ${error}`, {
        module: CONFIG_FILE_NAME,
        method: 'getListOfAuxCodes',
      });
      throw error;
    }
  }

  /**
   * Fetches all aux codes from all pages for the given orgId
   * @param {string} orgId
   * @param {number} pageSize
   * @param {string[]} filter
   * @param {string[]} attributes
   * @returns {Promise<AuxCode[]>}
   */
  public async getAllAuxCodes(
    orgId: string,
    pageSize: number,
    filter: string[],
    attributes: string[]
  ): Promise<AuxCode[]> {
    try {
      let allAuxCodes: AuxCode[] = [];
      let page = DEFAULT_PAGE;

      const firstResponse = await this.getListOfAuxCodes(orgId, page, pageSize, filter, attributes);
      allAuxCodes = allAuxCodes.concat(firstResponse.data);
      const totalPages = firstResponse.meta.totalPages;

      const promises: Promise<ListAuxCodesResponse>[] = [];
      for (page = DEFAULT_PAGE + 1; page < totalPages; page += 1) {
        promises.push(this.getListOfAuxCodes(orgId, page, pageSize, filter, attributes));
      }

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        allAuxCodes = allAuxCodes.concat(response.data);
      });

      return allAuxCodes;
    } catch (error) {
      LoggerProxy.error(`getAllAuxCodes API call failed with ${error}`, {
        module: CONFIG_FILE_NAME,
        method: 'getAllAuxCodes',
      });
      throw error;
    }
  }

  /**
   * Fetches the organization info for the given orgId.
   * @param {string} orgId
   * @returns {Promise<OrgInfo>}
   */
  public async getOrgInfo(orgId: string): Promise<OrgInfo> {
    try {
      const resource = endPointMap.orgInfo(orgId);
      const response = await this.httpReq.request({
        service: WCC_API_GATEWAY,
        resource,
        method: HTTP_METHODS.GET,
      });

      if (response.statusCode !== 200) {
        throw new Error(`API call failed with ${response.statusCode}`);
      }

      LoggerProxy.log('getOrgInfo api success.', {module: CONFIG_FILE_NAME, method: 'getOrgInfo'});

      return Promise.resolve(response.body);
    } catch (error) {
      LoggerProxy.error(`getOrgInfo API call failed with ${error}`, {
        module: CONFIG_FILE_NAME,
        method: 'getOrgInfo',
      });
      throw error;
    }
  }

  /**
   * Fetches the organization settings for the given orgId.
   * @param {string} orgId
   * @returns {Promise<OrgSettings>}
   */
  public async getOrganizationSetting(orgId: string): Promise<OrgSettings> {
    try {
      const resource = endPointMap.orgSettings(orgId);
      const response = await this.httpReq.request({
        service: WCC_API_GATEWAY,
        resource,
        method: HTTP_METHODS.GET,
      });

      if (response.statusCode !== 200) {
        throw new Error(`API call failed with ${response.statusCode}`);
      }

      LoggerProxy.log('getOrganizationSetting api success.', {
        module: CONFIG_FILE_NAME,
        method: 'getOrganizationSetting',
      });

      return Promise.resolve(response.body.data[0]);
    } catch (error) {
      LoggerProxy.error(`getOrganizationSetting API call failed with ${error}`, {
        module: CONFIG_FILE_NAME,
        method: 'getOrganizationSetting',
      });
      throw error;
    }
  }

  /**
   * Fetches the tenant data for the given orgId.
   * @param {string} orgId
   * @returns {Promise<TenantData>}
   */
  public async getTenantData(orgId: string): Promise<TenantData> {
    try {
      const resource = endPointMap.tenantData(orgId);
      const response = await this.httpReq.request({
        service: WCC_API_GATEWAY,
        resource,
        method: HTTP_METHODS.GET,
      });

      if (response.statusCode !== 200) {
        throw new Error(`API call failed with ${response.statusCode}`);
      }

      LoggerProxy.log('getTenantData api success.', {
        module: CONFIG_FILE_NAME,
        method: 'getTenantData',
      });

      return Promise.resolve(response.body.data[0]);
    } catch (error) {
      LoggerProxy.error(`getTenantData API call failed with ${error}`, {
        module: CONFIG_FILE_NAME,
        method: 'getTenantData',
      });
      throw error;
    }
  }

  /**
   * Fetches the URL mapping data for the given orgId.
   * @param {string} orgId
   * @returns {Promise<URLMapping[]>}
   */
  public async getURLMapping(orgId: string): Promise<URLMapping[]> {
    try {
      const resource = endPointMap.urlMapping(orgId);
      const response = await this.httpReq.request({
        service: WCC_API_GATEWAY,
        resource,
        method: HTTP_METHODS.GET,
      });

      if (response.statusCode !== 200) {
        throw new Error(`API call failed with ${response.statusCode}`);
      }

      LoggerProxy.log('getURLMapping api success.', {
        module: CONFIG_FILE_NAME,
        method: 'getURLMapping',
      });

      return Promise.resolve(response.body.data);
    } catch (error) {
      LoggerProxy.error(`getURLMapping API call failed with ${error}`, {
        module: CONFIG_FILE_NAME,
        method: 'getURLMapping',
      });
      throw error;
    }
  }

  /**
   * Fetches the dial plan data for the given orgId.
   * @param {string} orgId
   * @returns {Promise<DialPlanEntity[]>}
   */
  public async getDialPlanData(orgId: string): Promise<DialPlanEntity[]> {
    try {
      const resource = endPointMap.dialPlan(orgId);
      const response = await this.httpReq.request({
        service: WCC_API_GATEWAY,
        resource,
        method: HTTP_METHODS.GET,
      });

      if (response.statusCode !== 200) {
        throw new Error(`API call failed with ${response.statusCode}`);
      }

      LoggerProxy.log('getDialPlanData api success.', {
        module: CONFIG_FILE_NAME,
        method: 'getDialPlanData',
      });

      return Promise.resolve(response.body);
    } catch (error) {
      LoggerProxy.error(`getDialPlanData API call failed with ${error}`, {
        module: CONFIG_FILE_NAME,
        method: 'getDialPlanData',
      });
      throw error;
    }
  }
}
