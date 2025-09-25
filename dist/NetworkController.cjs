"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _NetworkController_instances, _NetworkController_ethQuery, _NetworkController_infuraProjectId, _NetworkController_previouslySelectedNetworkClientId, _NetworkController_providerProxy, _NetworkController_blockTrackerProxy, _NetworkController_autoManagedNetworkClientRegistry, _NetworkController_autoManagedNetworkClient, _NetworkController_log, _NetworkController_getRpcServiceOptions, _NetworkController_getBlockTrackerOptions, _NetworkController_networkConfigurationsByNetworkClientId, _NetworkController_isRpcFailoverEnabled, _NetworkController_updateRpcFailoverEnabled, _NetworkController_refreshNetwork, _NetworkController_getLatestBlock, _NetworkController_determineEIP1559Compatibility, _NetworkController_validateNetworkFields, _NetworkController_determineNetworkConfigurationToPersist, _NetworkController_registerNetworkClientsAsNeeded, _NetworkController_unregisterNetworkClientsAsNeeded, _NetworkController_updateNetworkConfigurations, _NetworkController_ensureAutoManagedNetworkClientRegistryPopulated, _NetworkController_createAutoManagedNetworkClientRegistry, _NetworkController_applyNetworkSelection;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkController = exports.selectAvailableNetworkClientIds = exports.getAvailableNetworkClientIds = exports.selectNetworkConfigurations = exports.getNetworkConfigurations = exports.getDefaultNetworkControllerState = exports.knownKeysOf = exports.RpcEndpointType = void 0;
const base_controller_1 = require("@metamask/base-controller");
const controller_utils_1 = require("@metamask/controller-utils");
const eth_query_1 = __importDefault(require("@metamask/eth-query"));
const rpc_errors_1 = require("@metamask/rpc-errors");
const swappable_obj_proxy_1 = require("@metamask/swappable-obj-proxy");
const utils_1 = require("@metamask/utils");
const fast_deep_equal_1 = __importDefault(require("fast-deep-equal"));
const immer_1 = require("immer");
const lodash_1 = require("lodash");
const reselect_1 = require("reselect");
const URI = __importStar(require("uri-js"));
const uuid_1 = require("uuid");
const constants_1 = require("./constants.cjs");
const create_auto_managed_network_client_1 = require("./create-auto-managed-network-client.cjs");
const logger_1 = require("./logger.cjs");
const types_1 = require("./types.cjs");
const debugLog = (0, logger_1.createModuleLogger)(logger_1.projectLogger, 'NetworkController');
const INFURA_URL_REGEX = /^https:\/\/(?<networkName>[^.]+)\.infura\.io\/v\d+\/(?<apiKey>.+)$/u;
/**
 * The type of an RPC endpoint.
 *
 * @see {@link CustomRpcEndpoint}
 * @see {@link InfuraRpcEndpoint}
 */
var RpcEndpointType;
(function (RpcEndpointType) {
    RpcEndpointType["Custom"] = "custom";
    RpcEndpointType["Infura"] = "infura";
})(RpcEndpointType || (exports.RpcEndpointType = RpcEndpointType = {}));
/**
 * `Object.keys()` is intentionally generic: it returns the keys of an object,
 * but it cannot make guarantees about the contents of that object, so the type
 * of the keys is merely `string[]`. While this is technically accurate, it is
 * also unnecessary if we have an object that we own and whose contents are
 * known exactly.
 *
 * TODO: Move to @metamask/utils.
 *
 * @param object - The object.
 * @returns The keys of an object, typed according to the type of the object
 * itself.
 */
// TODO: Either fix this lint violation or explain why it's necessary to ignore.
// eslint-disable-next-line @typescript-eslint/naming-convention
function knownKeysOf(
// TODO: Replace `any` with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
object) {
    return Object.keys(object);
}
exports.knownKeysOf = knownKeysOf;
/**
 * Type guard for determining whether the given value is an error object with a
 * `code` property, such as an instance of Error.
 *
 * TODO: Move this to @metamask/utils.
 *
 * @param error - The object to check.
 * @returns True if `error` has a `code`, false otherwise.
 */
function isErrorWithCode(error) {
    return typeof error === 'object' && error !== null && 'code' in error;
}
const controllerName = 'NetworkController';
/**
 * Constructs a value for the state property `networkConfigurationsByChainId`
 * which will be used if it has not been provided to the constructor.
 *
 * @param [additionalDefaultNetworks] - An array of Hex Chain IDs representing the additional networks to be included as default.
 * @returns The default value for `networkConfigurationsByChainId`.
 */
function getDefaultNetworkConfigurationsByChainId(additionalDefaultNetworks = []) {
    const infuraNetworks = getDefaultInfuraNetworkConfigurationsByChainId();
    const customNetworks = getDefaultCustomNetworkConfigurationsByChainId();
    return additionalDefaultNetworks.reduce((obj, chainId) => {
        if ((0, utils_1.hasProperty)(customNetworks, chainId)) {
            obj[chainId] = customNetworks[chainId];
        }
        return obj;
    }, 
    // Always include the infura networks in the default networks
    infuraNetworks);
}
/**
 * Constructs a `networkConfigurationsByChainId` object for all default Infura networks.
 *
 * @returns The `networkConfigurationsByChainId` object of all Infura networks.
 */
function getDefaultInfuraNetworkConfigurationsByChainId() {
    return Object.values(controller_utils_1.InfuraNetworkType).reduce((obj, infuraNetworkType) => {
        const chainId = controller_utils_1.ChainId[infuraNetworkType];
        // Skip deprecated network as default network.
        if (constants_1.DEPRECATED_NETWORKS.has(chainId)) {
            return obj;
        }
        const rpcEndpointUrl = 
        // This ESLint rule mistakenly produces an error.
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `https://${infuraNetworkType}.infura.io/v3/{infuraProjectId}`;
        const networkConfiguration = {
            blockExplorerUrls: [],
            chainId,
            defaultRpcEndpointIndex: 0,
            name: controller_utils_1.NetworkNickname[infuraNetworkType],
            nativeCurrency: controller_utils_1.NetworksTicker[infuraNetworkType],
            rpcEndpoints: [
                {
                    failoverUrls: [],
                    networkClientId: infuraNetworkType,
                    type: RpcEndpointType.Infura,
                    url: rpcEndpointUrl,
                },
            ],
        };
        return { ...obj, [chainId]: networkConfiguration };
    }, {});
}
/**
 * Constructs a `networkConfigurationsByChainId` object for all default custom networks.
 *
 * @returns The `networkConfigurationsByChainId` object of all custom networks.
 */
function getDefaultCustomNetworkConfigurationsByChainId() {
    // Create the `networkConfigurationsByChainId` objects explicitly,
    // Because it is not always guaranteed that the custom networks are included in the
    // default networks.
    return {
        [controller_utils_1.ChainId['megaeth-testnet']]: getCustomNetworkConfiguration(controller_utils_1.CustomNetworkType['megaeth-testnet']),
        [controller_utils_1.ChainId['monad-testnet']]: getCustomNetworkConfiguration(controller_utils_1.CustomNetworkType['monad-testnet']),
    };
}
/**
 * Constructs a `NetworkConfiguration` object by `CustomNetworkType`.
 *
 * @param customNetworkType - The type of the custom network.
 * @returns The `NetworkConfiguration` object.
 */
function getCustomNetworkConfiguration(customNetworkType) {
    const { ticker, rpcPrefs } = controller_utils_1.BUILT_IN_NETWORKS[customNetworkType];
    const rpcEndpointUrl = controller_utils_1.BUILT_IN_CUSTOM_NETWORKS_RPC[customNetworkType];
    return {
        blockExplorerUrls: [rpcPrefs.blockExplorerUrl],
        chainId: controller_utils_1.ChainId[customNetworkType],
        defaultRpcEndpointIndex: 0,
        defaultBlockExplorerUrlIndex: 0,
        name: controller_utils_1.NetworkNickname[customNetworkType],
        nativeCurrency: ticker,
        rpcEndpoints: [
            {
                failoverUrls: [],
                networkClientId: customNetworkType,
                type: RpcEndpointType.Custom,
                url: rpcEndpointUrl,
            },
        ],
    };
}
/**
 * Constructs properties for the NetworkController state whose values will be
 * used if not provided to the constructor.
 *
 * @param [additionalDefaultNetworks] - An array of Hex Chain IDs representing the additional networks to be included as default.
 * @returns The default NetworkController state.
 */
function getDefaultNetworkControllerState(additionalDefaultNetworks) {
    const networksMetadata = {};
    const networkConfigurationsByChainId = getDefaultNetworkConfigurationsByChainId(additionalDefaultNetworks);
    return {
        selectedNetworkClientId: controller_utils_1.InfuraNetworkType.mainnet,
        networksMetadata,
        networkConfigurationsByChainId,
    };
}
exports.getDefaultNetworkControllerState = getDefaultNetworkControllerState;
/**
 * Redux selector for getting all network configurations from NetworkController
 * state, keyed by chain ID.
 *
 * @param state - NetworkController state
 * @returns All registered network configurations, keyed by chain ID.
 */
const selectNetworkConfigurationsByChainId = (state) => state.networkConfigurationsByChainId;
/**
 * Get a list of all network configurations.
 *
 * @param state - NetworkController state
 * @returns A list of all available network configurations
 */
function getNetworkConfigurations(state) {
    return Object.values(state.networkConfigurationsByChainId);
}
exports.getNetworkConfigurations = getNetworkConfigurations;
/**
 * Redux selector for getting a list of all network configurations from
 * NetworkController state.
 *
 * @param state - NetworkController state
 * @returns A list of all available network configurations
 */
exports.selectNetworkConfigurations = (0, reselect_1.createSelector)(selectNetworkConfigurationsByChainId, (networkConfigurationsByChainId) => Object.values(networkConfigurationsByChainId));
/**
 * Get a list of all available network client IDs from a list of network
 * configurations.
 *
 * @param networkConfigurations - The array of network configurations
 * @returns A list of all available client IDs
 */
function getAvailableNetworkClientIds(networkConfigurations) {
    return networkConfigurations.flatMap((networkConfiguration) => networkConfiguration.rpcEndpoints.map((rpcEndpoint) => rpcEndpoint.networkClientId));
}
exports.getAvailableNetworkClientIds = getAvailableNetworkClientIds;
/**
 * Redux selector for getting a list of all available network client IDs
 * from NetworkController state.
 *
 * @param state - NetworkController state
 * @returns A list of all available network client IDs.
 */
exports.selectAvailableNetworkClientIds = (0, reselect_1.createSelector)(exports.selectNetworkConfigurations, getAvailableNetworkClientIds);
/**
 * Determines whether the given URL is valid by attempting to parse it.
 *
 * @param url - The URL to test.
 * @returns True if the URL is valid, false otherwise.
 */
function isValidUrl(url) {
    const uri = URI.parse(url);
    return (uri.error === undefined && (uri.scheme === 'http' || uri.scheme === 'https'));
}
/**
 * Given an Infura API URL, extracts the subdomain that identifies the Infura
 * network.
 *
 * @param rpcEndpointUrl - The URL to operate on.
 * @returns The Infura network name that the URL references.
 * @throws if the URL is not an Infura API URL, or if an Infura network is not
 * present in the URL.
 */
function deriveInfuraNetworkNameFromRpcEndpointUrl(rpcEndpointUrl) {
    const match = INFURA_URL_REGEX.exec(rpcEndpointUrl);
    if (match?.groups) {
        if ((0, controller_utils_1.isInfuraNetworkType)(match.groups.networkName)) {
            return match.groups.networkName;
        }
        throw new Error(`Unknown Infura network '${match.groups.networkName}'`);
    }
    throw new Error('Could not derive Infura network from RPC endpoint URL');
}
/**
 * Performs a series of checks that the given NetworkController state is
 * internally consistent — that all parts of state that are supposed to match in
 * fact do — so that working with the state later on doesn't cause unexpected
 * errors.
 *
 * In the case of NetworkController, there are several parts of state that need
 * to match. For instance, `defaultRpcEndpointIndex` needs to match an entry
 * within `rpcEndpoints`, and `selectedNetworkClientId` needs to point to an RPC
 * endpoint within a network configuration.
 *
 * @param state - The NetworkController state to verify.
 * @throws if the state is invalid in some way.
 */
function validateInitialState(state) {
    const networkConfigurationEntries = Object.entries(state.networkConfigurationsByChainId);
    const networkClientIds = getAvailableNetworkClientIds(getNetworkConfigurations(state));
    if (networkConfigurationEntries.length === 0) {
        throw new Error('NetworkController state is invalid: `networkConfigurationsByChainId` cannot be empty');
    }
    for (const [chainId, networkConfiguration] of networkConfigurationEntries) {
        if (chainId !== networkConfiguration.chainId) {
            throw new Error(`NetworkController state has invalid \`networkConfigurationsByChainId\`: Network configuration '${networkConfiguration.name}' is filed under '${chainId}' which does not match its \`chainId\` of '${networkConfiguration.chainId}'`);
        }
        const isInvalidDefaultBlockExplorerUrlIndex = networkConfiguration.blockExplorerUrls.length > 0
            ? networkConfiguration.defaultBlockExplorerUrlIndex === undefined ||
                networkConfiguration.blockExplorerUrls[networkConfiguration.defaultBlockExplorerUrlIndex] === undefined
            : networkConfiguration.defaultBlockExplorerUrlIndex !== undefined;
        if (isInvalidDefaultBlockExplorerUrlIndex) {
            throw new Error(`NetworkController state has invalid \`networkConfigurationsByChainId\`: Network configuration '${networkConfiguration.name}' has a \`defaultBlockExplorerUrlIndex\` that does not refer to an entry in \`blockExplorerUrls\``);
        }
        if (networkConfiguration.rpcEndpoints[networkConfiguration.defaultRpcEndpointIndex] === undefined) {
            throw new Error(`NetworkController state has invalid \`networkConfigurationsByChainId\`: Network configuration '${networkConfiguration.name}' has a \`defaultRpcEndpointIndex\` that does not refer to an entry in \`rpcEndpoints\``);
        }
    }
    if ([...new Set(networkClientIds)].length < networkClientIds.length) {
        throw new Error('NetworkController state has invalid `networkConfigurationsByChainId`: Every RPC endpoint across all network configurations must have a unique `networkClientId`');
    }
}
/**
 * Checks that the given initial NetworkController state is internally
 * consistent similar to `validateInitialState`, but if an anomaly is detected,
 * it does its best to correct the state and logs an error to Sentry.
 *
 * @param state - The NetworkController state to verify.
 * @param messenger - The NetworkController messenger.
 * @returns The corrected state.
 */
function correctInitialState(state, messenger) {
    const networkConfigurationsSortedByChainId = getNetworkConfigurations(state).sort((a, b) => a.chainId.localeCompare(b.chainId));
    const networkClientIds = getAvailableNetworkClientIds(networkConfigurationsSortedByChainId);
    return (0, immer_1.produce)(state, (newState) => {
        if (!networkClientIds.includes(state.selectedNetworkClientId)) {
            const firstNetworkConfiguration = networkConfigurationsSortedByChainId[0];
            const newSelectedNetworkClientId = firstNetworkConfiguration.rpcEndpoints[firstNetworkConfiguration.defaultRpcEndpointIndex].networkClientId;
            messenger.call('ErrorReportingService:captureException', new Error(`\`selectedNetworkClientId\` '${state.selectedNetworkClientId}' does not refer to an RPC endpoint within a network configuration; correcting to '${newSelectedNetworkClientId}'`));
            newState.selectedNetworkClientId = newSelectedNetworkClientId;
        }
    });
}
/**
 * Transforms a map of chain ID to network configuration to a map of network
 * client ID to network configuration.
 *
 * @param networkConfigurationsByChainId - The network configurations, keyed by
 * chain ID.
 * @returns The network configurations, keyed by network client ID.
 */
function buildNetworkConfigurationsByNetworkClientId(networkConfigurationsByChainId) {
    return new Map(Object.values(networkConfigurationsByChainId).flatMap((networkConfiguration) => {
        return networkConfiguration.rpcEndpoints.map((rpcEndpoint) => {
            return [rpcEndpoint.networkClientId, networkConfiguration];
        });
    }));
}
/**
 * Controller that creates and manages an Ethereum network provider.
 */
class NetworkController extends base_controller_1.BaseController {
    /**
     * Constructs a NetworkController.
     *
     * @param options - The options; see {@link NetworkControllerOptions}.
     */
    constructor(options) {
        const { messenger, state, infuraProjectId, log, getRpcServiceOptions, getBlockTrackerOptions, additionalDefaultNetworks, isRpcFailoverEnabled = false, } = options;
        const initialState = {
            ...getDefaultNetworkControllerState(additionalDefaultNetworks),
            ...state,
        };
        validateInitialState(initialState);
        const correctedInitialState = correctInitialState(initialState, messenger);
        if (!infuraProjectId || typeof infuraProjectId !== 'string') {
            throw new Error('Invalid Infura project ID');
        }
        super({
            name: controllerName,
            metadata: {
                selectedNetworkClientId: {
                    persist: true,
                    anonymous: false,
                },
                networksMetadata: {
                    persist: true,
                    anonymous: false,
                },
                networkConfigurationsByChainId: {
                    persist: true,
                    anonymous: false,
                },
            },
            messenger,
            state: correctedInitialState,
        });
        _NetworkController_instances.add(this);
        _NetworkController_ethQuery.set(this, void 0);
        _NetworkController_infuraProjectId.set(this, void 0);
        _NetworkController_previouslySelectedNetworkClientId.set(this, void 0);
        _NetworkController_providerProxy.set(this, void 0);
        _NetworkController_blockTrackerProxy.set(this, void 0);
        _NetworkController_autoManagedNetworkClientRegistry.set(this, void 0);
        _NetworkController_autoManagedNetworkClient.set(this, void 0);
        _NetworkController_log.set(this, void 0);
        _NetworkController_getRpcServiceOptions.set(this, void 0);
        _NetworkController_getBlockTrackerOptions.set(this, void 0);
        _NetworkController_networkConfigurationsByNetworkClientId.set(this, void 0);
        _NetworkController_isRpcFailoverEnabled.set(this, void 0);
        __classPrivateFieldSet(this, _NetworkController_infuraProjectId, infuraProjectId, "f");
        __classPrivateFieldSet(this, _NetworkController_log, log, "f");
        __classPrivateFieldSet(this, _NetworkController_getRpcServiceOptions, getRpcServiceOptions, "f");
        __classPrivateFieldSet(this, _NetworkController_getBlockTrackerOptions, getBlockTrackerOptions, "f");
        __classPrivateFieldSet(this, _NetworkController_isRpcFailoverEnabled, isRpcFailoverEnabled, "f");
        __classPrivateFieldSet(this, _NetworkController_previouslySelectedNetworkClientId, this.state.selectedNetworkClientId, "f");
        __classPrivateFieldSet(this, _NetworkController_networkConfigurationsByNetworkClientId, buildNetworkConfigurationsByNetworkClientId(this.state.networkConfigurationsByChainId), "f");
        this.messagingSystem.registerActionHandler(
        // TODO: Either fix this lint violation or explain why it's necessary to ignore.
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `${this.name}:getEthQuery`, () => {
            return __classPrivateFieldGet(this, _NetworkController_ethQuery, "f");
        });
        this.messagingSystem.registerActionHandler(
        // TODO: Either fix this lint violation or explain why it's necessary to ignore.
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `${this.name}:getNetworkClientById`, this.getNetworkClientById.bind(this));
        this.messagingSystem.registerActionHandler(
        // TODO: Either fix this lint violation or explain why it's necessary to ignore.
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `${this.name}:getEIP1559Compatibility`, this.getEIP1559Compatibility.bind(this));
        this.messagingSystem.registerActionHandler(
        // TODO: Either fix this lint violation or explain why it's necessary to ignore.
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `${this.name}:setActiveNetwork`, this.setActiveNetwork.bind(this));
        this.messagingSystem.registerActionHandler(
        // TODO: Either fix this lint violation or explain why it's necessary to ignore.
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `${this.name}:setProviderType`, this.setProviderType.bind(this));
        this.messagingSystem.registerActionHandler(
        // TODO: Either fix this lint violation or explain why it's necessary to ignore.
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `${this.name}:findNetworkClientIdByChainId`, this.findNetworkClientIdByChainId.bind(this));
        this.messagingSystem.registerActionHandler(
        // TODO: Either fix this lint violation or explain why it's necessary to ignore.
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `${this.name}:getNetworkConfigurationByChainId`, this.getNetworkConfigurationByChainId.bind(this));
        this.messagingSystem.registerActionHandler(
        // ESLint is mistaken here; `name` is a string.
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `${this.name}:getNetworkConfigurationByNetworkClientId`, this.getNetworkConfigurationByNetworkClientId.bind(this));
        this.messagingSystem.registerActionHandler(`${this.name}:getSelectedNetworkClient`, this.getSelectedNetworkClient.bind(this));
        this.messagingSystem.registerActionHandler(`${this.name}:getSelectedChainId`, this.getSelectedChainId.bind(this));
        this.messagingSystem.registerActionHandler(
        // ESLint is mistaken here; `name` is a string.
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `${this.name}:addNetwork`, this.addNetwork.bind(this));
        this.messagingSystem.registerActionHandler(
        // ESLint is mistaken here; `name` is a string.
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `${this.name}:removeNetwork`, this.removeNetwork.bind(this));
        this.messagingSystem.registerActionHandler(
        // ESLint is mistaken here; `name` is a string.
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `${this.name}:updateNetwork`, this.updateNetwork.bind(this));
    }
    /**
     * Enables the RPC failover functionality. That is, if any RPC endpoints are
     * configured with failover URLs, then traffic will automatically be diverted
     * to them if those RPC endpoints are unavailable.
     */
    enableRpcFailover() {
        __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_updateRpcFailoverEnabled).call(this, true);
    }
    /**
     * Disables the RPC failover functionality. That is, even if any RPC endpoints
     * are configured with failover URLs, then traffic will not automatically be
     * diverted to them if those RPC endpoints are unavailable.
     */
    disableRpcFailover() {
        __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_updateRpcFailoverEnabled).call(this, false);
    }
    /**
     * Accesses the provider and block tracker for the currently selected network.
     * @returns The proxy and block tracker proxies.
     * @deprecated This method has been replaced by `getSelectedNetworkClient` (which has a more easily used return type) and will be removed in a future release.
     */
    getProviderAndBlockTracker() {
        return {
            provider: __classPrivateFieldGet(this, _NetworkController_providerProxy, "f"),
            blockTracker: __classPrivateFieldGet(this, _NetworkController_blockTrackerProxy, "f"),
        };
    }
    /**
     * Accesses the provider and block tracker for the currently selected network.
     *
     * @returns an object with the provider and block tracker proxies for the currently selected network.
     */
    getSelectedNetworkClient() {
        if (__classPrivateFieldGet(this, _NetworkController_providerProxy, "f") && __classPrivateFieldGet(this, _NetworkController_blockTrackerProxy, "f")) {
            return {
                provider: __classPrivateFieldGet(this, _NetworkController_providerProxy, "f"),
                blockTracker: __classPrivateFieldGet(this, _NetworkController_blockTrackerProxy, "f"),
            };
        }
        return undefined;
    }
    /**
     * Accesses the chain ID from the selected network client.
     *
     * @returns The chain ID of the selected network client in hex format or undefined if there is no network client.
     */
    getSelectedChainId() {
        const networkConfiguration = this.getNetworkConfigurationByNetworkClientId(this.state.selectedNetworkClientId);
        return networkConfiguration?.chainId;
    }
    /**
     * Internally, the Infura and custom network clients are categorized by type
     * so that when accessing either kind of network client, TypeScript knows
     * which type to assign to the network client. For some cases it's more useful
     * to be able to access network clients by ID instead of by type and then ID,
     * so this function makes that possible.
     *
     * @returns The network clients registered so far, keyed by ID.
     */
    getNetworkClientRegistry() {
        const autoManagedNetworkClientRegistry = __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_ensureAutoManagedNetworkClientRegistryPopulated).call(this);
        return Object.assign({}, autoManagedNetworkClientRegistry[types_1.NetworkClientType.Infura], autoManagedNetworkClientRegistry[types_1.NetworkClientType.Custom]);
    }
    getNetworkClientById(networkClientId) {
        if (!networkClientId) {
            throw new Error('No network client ID was provided.');
        }
        const autoManagedNetworkClientRegistry = __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_ensureAutoManagedNetworkClientRegistryPopulated).call(this);
        if ((0, controller_utils_1.isInfuraNetworkType)(networkClientId)) {
            const infuraNetworkClient = autoManagedNetworkClientRegistry[types_1.NetworkClientType.Infura][networkClientId];
            // This is impossible to reach
            /* istanbul ignore if */
            if (!infuraNetworkClient) {
                throw new Error(
                // TODO: Either fix this lint violation or explain why it's necessary to ignore.
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                `No Infura network client was found with the ID "${networkClientId}".`);
            }
            return infuraNetworkClient;
        }
        const customNetworkClient = autoManagedNetworkClientRegistry[types_1.NetworkClientType.Custom][networkClientId];
        if (!customNetworkClient) {
            throw new Error(
            // TODO: Either fix this lint violation or explain why it's necessary to ignore.
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `No custom network client was found with the ID "${networkClientId}".`);
        }
        return customNetworkClient;
    }
    /**
     * Ensures that network clients for Infura and custom RPC endpoints have been
     * created. Then, consulting state, initializes and establishes the currently
     * selected network client.
     */
    async initializeProvider() {
        __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_applyNetworkSelection).call(this, this.state.selectedNetworkClientId);
        await this.lookupNetwork();
    }
    /**
     * Refreshes the network meta with EIP-1559 support and the network status
     * based on the given network client ID.
     *
     * @param networkClientId - The ID of the network client to update.
     */
    async lookupNetworkByClientId(networkClientId) {
        const isInfura = (0, controller_utils_1.isInfuraNetworkType)(networkClientId);
        let updatedNetworkStatus;
        let updatedIsEIP1559Compatible;
        try {
            updatedIsEIP1559Compatible =
                await __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_determineEIP1559Compatibility).call(this, networkClientId);
            updatedNetworkStatus = constants_1.NetworkStatus.Available;
        }
        catch (error) {
            debugLog('NetworkController: lookupNetworkByClientId: ', error);
            // TODO: mock ethQuery.sendAsync to throw error without error code
            /* istanbul ignore else */
            if (isErrorWithCode(error)) {
                let responseBody;
                if (isInfura &&
                    (0, utils_1.hasProperty)(error, 'message') &&
                    typeof error.message === 'string') {
                    try {
                        responseBody = JSON.parse(error.message);
                    }
                    catch {
                        // error.message must not be JSON
                        __classPrivateFieldGet(this, _NetworkController_log, "f")?.warn('NetworkController: lookupNetworkByClientId: json parse error: ', error);
                    }
                }
                if ((0, utils_1.isPlainObject)(responseBody) &&
                    responseBody.error === constants_1.INFURA_BLOCKED_KEY) {
                    updatedNetworkStatus = constants_1.NetworkStatus.Blocked;
                }
                else if (error.code === rpc_errors_1.errorCodes.rpc.internal) {
                    updatedNetworkStatus = constants_1.NetworkStatus.Unknown;
                    __classPrivateFieldGet(this, _NetworkController_log, "f")?.warn('NetworkController: lookupNetworkByClientId: rpc internal error: ', error);
                }
                else {
                    updatedNetworkStatus = constants_1.NetworkStatus.Unavailable;
                    __classPrivateFieldGet(this, _NetworkController_log, "f")?.warn('NetworkController: lookupNetworkByClientId: ', error);
                }
            }
            else if (typeof Error !== 'undefined' &&
                (0, utils_1.hasProperty)(error, 'message') &&
                typeof error.message === 'string' &&
                error.message.includes('No custom network client was found with the ID')) {
                throw error;
            }
            else {
                debugLog('NetworkController - could not determine network status', error);
                updatedNetworkStatus = constants_1.NetworkStatus.Unknown;
                __classPrivateFieldGet(this, _NetworkController_log, "f")?.warn('NetworkController: lookupNetworkByClientId: ', error);
            }
        }
        this.update((state) => {
            if (state.networksMetadata[networkClientId] === undefined) {
                state.networksMetadata[networkClientId] = {
                    status: constants_1.NetworkStatus.Unknown,
                    EIPS: {},
                };
            }
            const meta = state.networksMetadata[networkClientId];
            meta.status = updatedNetworkStatus;
            if (updatedIsEIP1559Compatible === undefined) {
                delete meta.EIPS[1559];
            }
            else {
                meta.EIPS[1559] = updatedIsEIP1559Compatible;
            }
        });
    }
    /**
     * Persists the following metadata about the given or selected network to
     * state:
     *
     * - The status of the network, namely, whether it is available, geo-blocked
     * (Infura only), or unavailable, or whether the status is unknown
     * - Whether the network supports EIP-1559, or whether it is unknown
     *
     * Note that it is possible for the network to be switched while this data is
     * being collected. If that is the case, no metadata for the (now previously)
     * selected network will be updated.
     *
     * @param networkClientId - The ID of the network client to update.
     * If no ID is provided, uses the currently selected network.
     */
    async lookupNetwork(networkClientId) {
        if (networkClientId) {
            await this.lookupNetworkByClientId(networkClientId);
            return;
        }
        if (!__classPrivateFieldGet(this, _NetworkController_ethQuery, "f")) {
            return;
        }
        const isInfura = __classPrivateFieldGet(this, _NetworkController_autoManagedNetworkClient, "f")?.configuration.type ===
            types_1.NetworkClientType.Infura;
        let networkChanged = false;
        const listener = () => {
            networkChanged = true;
            try {
                this.messagingSystem.unsubscribe('NetworkController:networkDidChange', listener);
            }
            catch (error) {
                // In theory, this `catch` should not be necessary given that this error
                // would occur "inside" of the call to `#determineEIP1559Compatibility`
                // below and so it should be caught by the `try`/`catch` below (it is
                // impossible to reproduce in tests for that reason). However, somehow
                // it occurs within Mobile and so we have to add our own `try`/`catch`
                // here.
                /* istanbul ignore next */
                if (!(error instanceof Error) ||
                    error.message !==
                        'Subscription not found for event: NetworkController:networkDidChange') {
                    // Again, this error should not happen and is impossible to reproduce
                    // in tests.
                    /* istanbul ignore next */
                    throw error;
                }
            }
        };
        this.messagingSystem.subscribe('NetworkController:networkDidChange', listener);
        let updatedNetworkStatus;
        let updatedIsEIP1559Compatible;
        try {
            const isEIP1559Compatible = await __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_determineEIP1559Compatibility).call(this, this.state.selectedNetworkClientId);
            updatedNetworkStatus = constants_1.NetworkStatus.Available;
            updatedIsEIP1559Compatible = isEIP1559Compatible;
        }
        catch (error) {
            // TODO: mock ethQuery.sendAsync to throw error without error code
            /* istanbul ignore else */
            if (isErrorWithCode(error)) {
                let responseBody;
                if (isInfura &&
                    (0, utils_1.hasProperty)(error, 'message') &&
                    typeof error.message === 'string') {
                    try {
                        responseBody = JSON.parse(error.message);
                    }
                    catch (parseError) {
                        // error.message must not be JSON
                        __classPrivateFieldGet(this, _NetworkController_log, "f")?.warn('NetworkController: lookupNetwork: json parse error', parseError);
                    }
                }
                if ((0, utils_1.isPlainObject)(responseBody) &&
                    responseBody.error === constants_1.INFURA_BLOCKED_KEY) {
                    updatedNetworkStatus = constants_1.NetworkStatus.Blocked;
                }
                else if (error.code === rpc_errors_1.errorCodes.rpc.internal) {
                    updatedNetworkStatus = constants_1.NetworkStatus.Unknown;
                    __classPrivateFieldGet(this, _NetworkController_log, "f")?.warn('NetworkController: lookupNetwork: rpc internal error', error);
                }
                else {
                    updatedNetworkStatus = constants_1.NetworkStatus.Unavailable;
                    __classPrivateFieldGet(this, _NetworkController_log, "f")?.warn('NetworkController: lookupNetwork: ', error);
                }
            }
            else {
                debugLog('NetworkController - could not determine network status', error);
                updatedNetworkStatus = constants_1.NetworkStatus.Unknown;
                __classPrivateFieldGet(this, _NetworkController_log, "f")?.warn('NetworkController: lookupNetwork: ', error);
            }
        }
        if (networkChanged) {
            // If the network has changed, then `lookupNetwork` either has been or is
            // in the process of being called, so we don't need to go further.
            return;
        }
        try {
            this.messagingSystem.unsubscribe('NetworkController:networkDidChange', listener);
        }
        catch (error) {
            if (!(error instanceof Error) ||
                error.message !==
                    'Subscription not found for event: NetworkController:networkDidChange') {
                throw error;
            }
        }
        this.update((state) => {
            const meta = state.networksMetadata[state.selectedNetworkClientId];
            meta.status = updatedNetworkStatus;
            if (updatedIsEIP1559Compatible === undefined) {
                delete meta.EIPS[1559];
            }
            else {
                meta.EIPS[1559] = updatedIsEIP1559Compatible;
            }
        });
        if (isInfura) {
            if (updatedNetworkStatus === constants_1.NetworkStatus.Available) {
                this.messagingSystem.publish('NetworkController:infuraIsUnblocked');
            }
            else if (updatedNetworkStatus === constants_1.NetworkStatus.Blocked) {
                this.messagingSystem.publish('NetworkController:infuraIsBlocked');
            }
        }
        else {
            // Always publish infuraIsUnblocked regardless of network status to
            // prevent consumers from being stuck in a blocked state if they were
            // previously connected to an Infura network that was blocked
            this.messagingSystem.publish('NetworkController:infuraIsUnblocked');
        }
    }
    /**
     * Convenience method to update provider network type settings.
     *
     * @param type - Human readable network name.
     * @deprecated This has been replaced by `setActiveNetwork`, and will be
     * removed in a future release
     */
    async setProviderType(type) {
        if (type === controller_utils_1.NetworkType.rpc) {
            throw new Error(
            // This ESLint rule mistakenly produces an error.
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `NetworkController - cannot call "setProviderType" with type "${controller_utils_1.NetworkType.rpc}". Use "setActiveNetwork"`);
        }
        if (!(0, controller_utils_1.isInfuraNetworkType)(type)) {
            throw new Error(`Unknown Infura provider type "${String(type)}".`);
        }
        await this.setActiveNetwork(type);
    }
    /**
     * Changes the selected network.
     *
     * @param networkClientId - The ID of a network client that will be used to
     * make requests.
     * @param options - Options for this method.
     * @param options.updateState - Allows for updating state.
     * @throws if no network client is associated with the given
     * network client ID.
     */
    async setActiveNetwork(networkClientId, options = {}) {
        __classPrivateFieldSet(this, _NetworkController_previouslySelectedNetworkClientId, this.state.selectedNetworkClientId, "f");
        await __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_refreshNetwork).call(this, networkClientId, options);
    }
    /**
     * Determines whether the network supports EIP-1559 by checking whether the
     * latest block has a `baseFeePerGas` property, then updates state
     * appropriately.
     *
     * @param networkClientId - The networkClientId to fetch the correct provider against which to check 1559 compatibility.
     * @returns A promise that resolves to true if the network supports EIP-1559
     * , false otherwise, or `undefined` if unable to determine the compatibility.
     */
    async getEIP1559Compatibility(networkClientId) {
        if (networkClientId) {
            return this.get1559CompatibilityWithNetworkClientId(networkClientId);
        }
        if (!__classPrivateFieldGet(this, _NetworkController_ethQuery, "f")) {
            return false;
        }
        const { EIPS } = this.state.networksMetadata[this.state.selectedNetworkClientId];
        if (EIPS[1559] !== undefined) {
            return EIPS[1559];
        }
        const isEIP1559Compatible = await __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_determineEIP1559Compatibility).call(this, this.state.selectedNetworkClientId);
        this.update((state) => {
            if (isEIP1559Compatible !== undefined) {
                state.networksMetadata[state.selectedNetworkClientId].EIPS[1559] =
                    isEIP1559Compatible;
            }
        });
        return isEIP1559Compatible;
    }
    async get1559CompatibilityWithNetworkClientId(networkClientId) {
        let metadata = this.state.networksMetadata[networkClientId];
        if (metadata === undefined) {
            await this.lookupNetwork(networkClientId);
            metadata = this.state.networksMetadata[networkClientId];
        }
        const { EIPS } = metadata;
        // may want to include some 'freshness' value - something to make sure we refetch this from time to time
        return EIPS[1559];
    }
    /**
     * Ensures that the provider and block tracker proxies are pointed to the
     * currently selected network and refreshes the metadata for the
     */
    async resetConnection() {
        await __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_refreshNetwork).call(this, this.state.selectedNetworkClientId);
    }
    /**
     * Returns the network configuration that has been filed under the given chain
     * ID.
     *
     * @param chainId - The chain ID to use as a key.
     * @returns The network configuration if one exists, or undefined.
     */
    getNetworkConfigurationByChainId(chainId) {
        return this.state.networkConfigurationsByChainId[chainId];
    }
    /**
     * Returns the network configuration that contains an RPC endpoint with the
     * given network client ID.
     *
     * @param networkClientId - The network client ID to use as a key.
     * @returns The network configuration if one exists, or undefined.
     */
    getNetworkConfigurationByNetworkClientId(networkClientId) {
        return __classPrivateFieldGet(this, _NetworkController_networkConfigurationsByNetworkClientId, "f").get(networkClientId);
    }
    /**
     * Creates and registers network clients for the collection of Infura and
     * custom RPC endpoints that can be used to make requests for a particular
     * chain, storing the given configuration object in state for later reference.
     *
     * @param fields - The object that describes the new network/chain and lists
     * the RPC endpoints which front that chain.
     * @returns The newly added network configuration.
     * @throws if any part of `fields` would produce invalid state.
     * @see {@link NetworkConfiguration}
     */
    addNetwork(fields) {
        const { rpcEndpoints: setOfRpcEndpointFields } = fields;
        const autoManagedNetworkClientRegistry = __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_ensureAutoManagedNetworkClientRegistryPopulated).call(this);
        __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_validateNetworkFields).call(this, {
            mode: 'add',
            networkFields: fields,
            autoManagedNetworkClientRegistry,
        });
        const networkClientOperations = setOfRpcEndpointFields.map((defaultOrCustomRpcEndpointFields) => {
            const rpcEndpoint = defaultOrCustomRpcEndpointFields.type === RpcEndpointType.Custom
                ? {
                    ...defaultOrCustomRpcEndpointFields,
                    networkClientId: (0, uuid_1.v4)(),
                }
                : defaultOrCustomRpcEndpointFields;
            return {
                type: 'add',
                rpcEndpoint,
            };
        });
        const newNetworkConfiguration = __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_determineNetworkConfigurationToPersist).call(this, {
            networkFields: fields,
            networkClientOperations,
        });
        __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_registerNetworkClientsAsNeeded).call(this, {
            networkFields: fields,
            networkClientOperations,
            autoManagedNetworkClientRegistry,
        });
        this.update((state) => {
            __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_updateNetworkConfigurations).call(this, {
                state,
                mode: 'add',
                networkFields: fields,
                networkConfigurationToPersist: newNetworkConfiguration,
            });
        });
        this.messagingSystem.publish(`${controllerName}:networkAdded`, newNetworkConfiguration);
        return newNetworkConfiguration;
    }
    /**
     * Updates the configuration for a previously stored network filed under the
     * given chain ID, creating + registering new network clients to represent RPC
     * endpoints that have been added and destroying + unregistering existing
     * network clients for RPC endpoints that have been removed.
     *
     * Note that if `chainId` is changed, then all network clients associated with
     * that chain will be removed and re-added, even if none of the RPC endpoints
     * have changed.
     *
     * @param chainId - The chain ID associated with an existing network.
     * @param fields - The object that describes the updates to the network/chain,
     * including the new set of RPC endpoints which should front that chain.
     * @param options - Options to provide.
     * @param options.replacementSelectedRpcEndpointIndex - Usually you cannot
     * remove an RPC endpoint that is being represented by the currently selected
     * network client. This option allows you to specify another RPC endpoint
     * (either an existing one or a new one) that should be used to select a new
     * network instead.
     * @returns The updated network configuration.
     * @throws if `chainId` does not refer to an existing network configuration,
     * if any part of `fields` would produce invalid state, etc.
     * @see {@link NetworkConfiguration}
     */
    async updateNetwork(chainId, fields, { replacementSelectedRpcEndpointIndex, } = {}) {
        const existingNetworkConfiguration = this.state.networkConfigurationsByChainId[chainId];
        if (existingNetworkConfiguration === undefined) {
            throw new Error(`Could not update network: Cannot find network configuration for chain '${chainId}'`);
        }
        const existingChainId = chainId;
        const { chainId: newChainId, rpcEndpoints: setOfNewRpcEndpointFields } = fields;
        const autoManagedNetworkClientRegistry = __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_ensureAutoManagedNetworkClientRegistryPopulated).call(this);
        __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_validateNetworkFields).call(this, {
            mode: 'update',
            networkFields: fields,
            existingNetworkConfiguration,
            autoManagedNetworkClientRegistry,
        });
        const networkClientOperations = [];
        for (const newRpcEndpointFields of setOfNewRpcEndpointFields) {
            const existingRpcEndpointForNoop = existingNetworkConfiguration.rpcEndpoints.find((rpcEndpoint) => {
                return (rpcEndpoint.type === newRpcEndpointFields.type &&
                    rpcEndpoint.url === newRpcEndpointFields.url &&
                    (rpcEndpoint.networkClientId ===
                        newRpcEndpointFields.networkClientId ||
                        newRpcEndpointFields.networkClientId === undefined));
            });
            const existingRpcEndpointForReplaceWhenChainChanged = existingNetworkConfiguration.rpcEndpoints.find((rpcEndpoint) => {
                return ((rpcEndpoint.type === RpcEndpointType.Infura &&
                    newRpcEndpointFields.type === RpcEndpointType.Infura) ||
                    (rpcEndpoint.type === newRpcEndpointFields.type &&
                        rpcEndpoint.networkClientId ===
                            newRpcEndpointFields.networkClientId &&
                        rpcEndpoint.url === newRpcEndpointFields.url));
            });
            const existingRpcEndpointForReplaceWhenChainNotChanged = existingNetworkConfiguration.rpcEndpoints.find((rpcEndpoint) => {
                return (rpcEndpoint.type === newRpcEndpointFields.type &&
                    (rpcEndpoint.url === newRpcEndpointFields.url ||
                        rpcEndpoint.networkClientId ===
                            newRpcEndpointFields.networkClientId));
            });
            if (newChainId !== existingChainId &&
                existingRpcEndpointForReplaceWhenChainChanged !== undefined) {
                const newRpcEndpoint = newRpcEndpointFields.type === RpcEndpointType.Infura
                    ? newRpcEndpointFields
                    : { ...newRpcEndpointFields, networkClientId: (0, uuid_1.v4)() };
                networkClientOperations.push({
                    type: 'replace',
                    oldRpcEndpoint: existingRpcEndpointForReplaceWhenChainChanged,
                    newRpcEndpoint,
                });
            }
            else if (existingRpcEndpointForNoop !== undefined) {
                let newRpcEndpoint;
                if (existingRpcEndpointForNoop.type === RpcEndpointType.Infura) {
                    newRpcEndpoint = existingRpcEndpointForNoop;
                }
                else {
                    // `networkClientId` shouldn't be missing at this point; if it is,
                    // that's a mistake, so fill it back in
                    newRpcEndpoint = Object.assign({}, newRpcEndpointFields, {
                        networkClientId: existingRpcEndpointForNoop.networkClientId,
                    });
                }
                networkClientOperations.push({
                    type: 'noop',
                    rpcEndpoint: newRpcEndpoint,
                });
            }
            else if (existingRpcEndpointForReplaceWhenChainNotChanged !== undefined) {
                let newRpcEndpoint;
                /* istanbul ignore if */
                if (newRpcEndpointFields.type === RpcEndpointType.Infura) {
                    // This case can't actually happen. If we're here, it means that some
                    // part of the RPC endpoint changed. But there is no part of an Infura
                    // RPC endpoint that can be changed (as it would immediately make that
                    // RPC endpoint self-inconsistent). This is just here to appease
                    // TypeScript.
                    newRpcEndpoint = newRpcEndpointFields;
                }
                else {
                    newRpcEndpoint = {
                        ...newRpcEndpointFields,
                        networkClientId: (0, uuid_1.v4)(),
                    };
                }
                networkClientOperations.push({
                    type: 'replace',
                    oldRpcEndpoint: existingRpcEndpointForReplaceWhenChainNotChanged,
                    newRpcEndpoint,
                });
            }
            else {
                const newRpcEndpoint = newRpcEndpointFields.type === RpcEndpointType.Infura
                    ? newRpcEndpointFields
                    : { ...newRpcEndpointFields, networkClientId: (0, uuid_1.v4)() };
                const networkClientOperation = {
                    type: 'add',
                    rpcEndpoint: newRpcEndpoint,
                };
                networkClientOperations.push(networkClientOperation);
            }
        }
        for (const existingRpcEndpoint of existingNetworkConfiguration.rpcEndpoints) {
            if (!networkClientOperations.some((networkClientOperation) => {
                const otherRpcEndpoint = networkClientOperation.type === 'replace'
                    ? networkClientOperation.oldRpcEndpoint
                    : networkClientOperation.rpcEndpoint;
                return (otherRpcEndpoint.type === existingRpcEndpoint.type &&
                    otherRpcEndpoint.networkClientId ===
                        existingRpcEndpoint.networkClientId &&
                    otherRpcEndpoint.url === existingRpcEndpoint.url);
            })) {
                const networkClientOperation = {
                    type: 'remove',
                    rpcEndpoint: existingRpcEndpoint,
                };
                networkClientOperations.push(networkClientOperation);
            }
        }
        const updatedNetworkConfiguration = __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_determineNetworkConfigurationToPersist).call(this, {
            networkFields: fields,
            networkClientOperations,
        });
        if (replacementSelectedRpcEndpointIndex === undefined &&
            networkClientOperations.some((networkClientOperation) => {
                return (networkClientOperation.type === 'remove' &&
                    networkClientOperation.rpcEndpoint.networkClientId ===
                        this.state.selectedNetworkClientId);
            }) &&
            !networkClientOperations.some((networkClientOperation) => {
                return (networkClientOperation.type === 'replace' &&
                    networkClientOperation.oldRpcEndpoint.networkClientId ===
                        this.state.selectedNetworkClientId);
            })) {
            throw new Error(
            // This ESLint rule mistakenly produces an error.
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Could not update network: Cannot update RPC endpoints in such a way that the selected network '${this.state.selectedNetworkClientId}' would be removed without a replacement. Choose a different RPC endpoint as the selected network via the \`replacementSelectedRpcEndpointIndex\` option.`);
        }
        __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_registerNetworkClientsAsNeeded).call(this, {
            networkFields: fields,
            networkClientOperations,
            autoManagedNetworkClientRegistry,
        });
        const replacementSelectedRpcEndpointWithIndex = networkClientOperations
            .map((networkClientOperation, index) => [networkClientOperation, index])
            .find(([networkClientOperation, _index]) => {
            return (networkClientOperation.type === 'replace' &&
                networkClientOperation.oldRpcEndpoint.networkClientId ===
                    this.state.selectedNetworkClientId);
        });
        const correctedReplacementSelectedRpcEndpointIndex = replacementSelectedRpcEndpointIndex ??
            replacementSelectedRpcEndpointWithIndex?.[1];
        let rpcEndpointToSelect;
        if (correctedReplacementSelectedRpcEndpointIndex !== undefined) {
            rpcEndpointToSelect =
                updatedNetworkConfiguration.rpcEndpoints[correctedReplacementSelectedRpcEndpointIndex];
            if (rpcEndpointToSelect === undefined) {
                throw new Error(`Could not update network: \`replacementSelectedRpcEndpointIndex\` ${correctedReplacementSelectedRpcEndpointIndex} does not refer to an entry in \`rpcEndpoints\``);
            }
        }
        if (rpcEndpointToSelect &&
            rpcEndpointToSelect.networkClientId !== this.state.selectedNetworkClientId) {
            await this.setActiveNetwork(rpcEndpointToSelect.networkClientId, {
                updateState: (state) => {
                    __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_updateNetworkConfigurations).call(this, {
                        state,
                        mode: 'update',
                        networkFields: fields,
                        networkConfigurationToPersist: updatedNetworkConfiguration,
                        existingNetworkConfiguration,
                    });
                },
            });
        }
        else {
            this.update((state) => {
                __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_updateNetworkConfigurations).call(this, {
                    state,
                    mode: 'update',
                    networkFields: fields,
                    networkConfigurationToPersist: updatedNetworkConfiguration,
                    existingNetworkConfiguration,
                });
            });
        }
        __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_unregisterNetworkClientsAsNeeded).call(this, {
            networkClientOperations,
            autoManagedNetworkClientRegistry,
        });
        return updatedNetworkConfiguration;
    }
    /**
     * Destroys and unregisters the network identified by the given chain ID, also
     * removing the associated network configuration from state.
     *
     * @param chainId - The chain ID associated with an existing network.
     * @throws if `chainId` does not refer to an existing network configuration,
     * or if the currently selected network is being removed.
     * @see {@link NetworkConfiguration}
     */
    removeNetwork(chainId) {
        const existingNetworkConfiguration = this.state.networkConfigurationsByChainId[chainId];
        if (existingNetworkConfiguration === undefined) {
            throw new Error(`Cannot find network configuration for chain '${chainId}'`);
        }
        if (existingNetworkConfiguration.rpcEndpoints.some((rpcEndpoint) => rpcEndpoint.networkClientId === this.state.selectedNetworkClientId)) {
            throw new Error(`Cannot remove the currently selected network`);
        }
        const autoManagedNetworkClientRegistry = __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_ensureAutoManagedNetworkClientRegistryPopulated).call(this);
        const networkClientOperations = existingNetworkConfiguration.rpcEndpoints.map((rpcEndpoint) => {
            return {
                type: 'remove',
                rpcEndpoint,
            };
        });
        __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_unregisterNetworkClientsAsNeeded).call(this, {
            networkClientOperations,
            autoManagedNetworkClientRegistry,
        });
        this.update((state) => {
            __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_updateNetworkConfigurations).call(this, {
                state,
                mode: 'remove',
                existingNetworkConfiguration,
            });
        });
        this.messagingSystem.publish('NetworkController:networkRemoved', existingNetworkConfiguration);
    }
    /**
     * Assuming that the network has been previously switched, switches to this
     * new network.
     *
     * If the network has not been previously switched, this method is equivalent
     * to {@link resetConnection}.
     */
    async rollbackToPreviousProvider() {
        await __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_refreshNetwork).call(this, __classPrivateFieldGet(this, _NetworkController_previouslySelectedNetworkClientId, "f"));
    }
    /**
     * Deactivates the controller, stopping any ongoing polling.
     *
     * In-progress requests will not be aborted.
     */
    async destroy() {
        await __classPrivateFieldGet(this, _NetworkController_blockTrackerProxy, "f")?.destroy();
    }
    /**
     * Merges the given backup data into controller state.
     *
     * @param backup - The data that has been backed up.
     * @param backup.networkConfigurationsByChainId - Network configurations,
     * keyed by chain ID.
     */
    loadBackup({ networkConfigurationsByChainId, }) {
        this.update((state) => {
            state.networkConfigurationsByChainId = {
                ...state.networkConfigurationsByChainId,
                ...networkConfigurationsByChainId,
            };
        });
    }
    /**
     * Searches for the default RPC endpoint configured for the given chain and
     * returns its network client ID. This can then be passed to
     * {@link getNetworkClientById} to retrieve the network client.
     *
     * @param chainId - Chain ID to search for.
     * @returns The ID of the network client created for the chain's default RPC
     * endpoint.
     */
    findNetworkClientIdByChainId(chainId) {
        const networkConfiguration = this.state.networkConfigurationsByChainId[chainId];
        if (!networkConfiguration) {
            throw new Error(`Invalid chain ID "${chainId}"`);
        }
        const { networkClientId } = networkConfiguration.rpcEndpoints[networkConfiguration.defaultRpcEndpointIndex];
        return networkClientId;
    }
}
exports.NetworkController = NetworkController;
_NetworkController_ethQuery = new WeakMap(), _NetworkController_infuraProjectId = new WeakMap(), _NetworkController_previouslySelectedNetworkClientId = new WeakMap(), _NetworkController_providerProxy = new WeakMap(), _NetworkController_blockTrackerProxy = new WeakMap(), _NetworkController_autoManagedNetworkClientRegistry = new WeakMap(), _NetworkController_autoManagedNetworkClient = new WeakMap(), _NetworkController_log = new WeakMap(), _NetworkController_getRpcServiceOptions = new WeakMap(), _NetworkController_getBlockTrackerOptions = new WeakMap(), _NetworkController_networkConfigurationsByNetworkClientId = new WeakMap(), _NetworkController_isRpcFailoverEnabled = new WeakMap(), _NetworkController_instances = new WeakSet(), _NetworkController_updateRpcFailoverEnabled = function _NetworkController_updateRpcFailoverEnabled(newIsRpcFailoverEnabled) {
    if (__classPrivateFieldGet(this, _NetworkController_isRpcFailoverEnabled, "f") === newIsRpcFailoverEnabled) {
        return;
    }
    const autoManagedNetworkClientRegistry = __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_ensureAutoManagedNetworkClientRegistryPopulated).call(this);
    for (const networkClientsById of Object.values(autoManagedNetworkClientRegistry)) {
        for (const networkClientId of Object.keys(networkClientsById)) {
            // Type assertion: We can assume that `networkClientId` is valid here.
            const networkClient = networkClientsById[networkClientId];
            if (networkClient.configuration.failoverRpcUrls &&
                networkClient.configuration.failoverRpcUrls.length > 0) {
                newIsRpcFailoverEnabled
                    ? networkClient.enableRpcFailover()
                    : networkClient.disableRpcFailover();
            }
        }
    }
    __classPrivateFieldSet(this, _NetworkController_isRpcFailoverEnabled, newIsRpcFailoverEnabled, "f");
}, _NetworkController_refreshNetwork = 
/**
 * Executes a series of steps to switch the network:
 *
 * 1. Notifies subscribers via the messenger that the network is about to be
 * switched (and, really, that the global provider and block tracker proxies
 * will be re-pointed to a new network).
 * 2. Looks up a known and preinitialized network client matching the given
 * ID and uses it to re-point the aforementioned provider and block tracker
 * proxies.
 * 3. Notifies subscribers via the messenger that the network has switched.
 * 4. Captures metadata for the newly switched network in state.
 *
 * @param networkClientId - The ID of a network client that requests will be
 * routed through (either the name of an Infura network or the ID of a custom
 * network configuration).
 * @param options - Options for this method.
 * @param options.updateState - Allows for updating state.
 */
async function _NetworkController_refreshNetwork(networkClientId, options = {}) {
    this.messagingSystem.publish('NetworkController:networkWillChange', this.state);
    __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_applyNetworkSelection).call(this, networkClientId, options);
    this.messagingSystem.publish('NetworkController:networkDidChange', this.state);
    await this.lookupNetwork();
}, _NetworkController_getLatestBlock = function _NetworkController_getLatestBlock(networkClientId) {
    if (networkClientId === undefined) {
        networkClientId = this.state.selectedNetworkClientId;
    }
    const networkClient = this.getNetworkClientById(networkClientId);
    const ethQuery = new eth_query_1.default(networkClient.provider);
    return new Promise((resolve, reject) => {
        ethQuery.sendAsync({ method: 'eth_getBlockByNumber', params: ['latest', false] }, (error, block) => {
            if (error) {
                reject(error);
            }
            else {
                // TODO: Validate this type
                resolve(block);
            }
        });
    });
}, _NetworkController_determineEIP1559Compatibility = 
/**
 * Retrieves and checks the latest block from the currently selected
 * network; if the block has a `baseFeePerGas` property, then we know
 * that the network supports EIP-1559; otherwise it doesn't.
 *
 * @param networkClientId - The networkClientId to fetch the correct provider against which to check 1559 compatibility
 * @returns A promise that resolves to `true` if the network supports EIP-1559,
 * `false` otherwise, or `undefined` if unable to retrieve the last block.
 */
async function _NetworkController_determineEIP1559Compatibility(networkClientId) {
    const latestBlock = await __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_getLatestBlock).call(this, networkClientId);
    if (!latestBlock) {
        return undefined;
    }
    return latestBlock.baseFeePerGas !== undefined;
}, _NetworkController_validateNetworkFields = function _NetworkController_validateNetworkFields(args) {
    const { mode, networkFields, autoManagedNetworkClientRegistry } = args;
    const existingNetworkConfiguration = 'existingNetworkConfiguration' in args
        ? args.existingNetworkConfiguration
        : null;
    const errorMessagePrefix = mode === 'update' ? 'Could not update network' : 'Could not add network';
    if (!(0, utils_1.isStrictHexString)(networkFields.chainId) ||
        !(0, controller_utils_1.isSafeChainId)(networkFields.chainId)) {
        throw new Error(`${errorMessagePrefix}: Invalid \`chainId\` '${networkFields.chainId}' (must start with "0x" and not exceed the maximum)`);
    }
    if (existingNetworkConfiguration === null ||
        networkFields.chainId !== existingNetworkConfiguration.chainId) {
        const existingNetworkConfigurationViaChainId = this.state.networkConfigurationsByChainId[networkFields.chainId];
        if (existingNetworkConfigurationViaChainId !== undefined) {
            if (existingNetworkConfiguration === null) {
                throw new Error(
                // This ESLint rule mistakenly produces an error.
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                `Could not add network for chain ${args.networkFields.chainId} as another network for that chain already exists ('${existingNetworkConfigurationViaChainId.name}')`);
            }
            else {
                throw new Error(
                // This ESLint rule mistakenly produces an error.
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                `Cannot move network from chain ${existingNetworkConfiguration.chainId} to ${networkFields.chainId} as another network for that chain already exists ('${existingNetworkConfigurationViaChainId.name}')`);
            }
        }
    }
    const isInvalidDefaultBlockExplorerUrlIndex = networkFields.blockExplorerUrls.length > 0
        ? networkFields.defaultBlockExplorerUrlIndex === undefined ||
            networkFields.blockExplorerUrls[networkFields.defaultBlockExplorerUrlIndex] === undefined
        : networkFields.defaultBlockExplorerUrlIndex !== undefined;
    if (isInvalidDefaultBlockExplorerUrlIndex) {
        throw new Error(`${errorMessagePrefix}: \`defaultBlockExplorerUrlIndex\` must refer to an entry in \`blockExplorerUrls\``);
    }
    if (networkFields.rpcEndpoints.length === 0) {
        throw new Error(`${errorMessagePrefix}: \`rpcEndpoints\` must be a non-empty array`);
    }
    for (const rpcEndpointFields of networkFields.rpcEndpoints) {
        if (!isValidUrl(rpcEndpointFields.url)) {
            throw new Error(
            // This ESLint rule mistakenly produces an error.
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `${errorMessagePrefix}: An entry in \`rpcEndpoints\` has invalid URL '${rpcEndpointFields.url}'`);
        }
        const networkClientId = 'networkClientId' in rpcEndpointFields
            ? rpcEndpointFields.networkClientId
            : undefined;
        if (rpcEndpointFields.type === RpcEndpointType.Custom &&
            networkClientId !== undefined &&
            (0, controller_utils_1.isInfuraNetworkType)(networkClientId)) {
            throw new Error(
            // This is a string.
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `${errorMessagePrefix}: Custom RPC endpoint '${rpcEndpointFields.url}' has invalid network client ID '${networkClientId}'`);
        }
        if (mode === 'update' &&
            networkClientId !== undefined &&
            rpcEndpointFields.type === RpcEndpointType.Custom &&
            !Object.values(autoManagedNetworkClientRegistry).some((networkClientsById) => networkClientId in networkClientsById)) {
            throw new Error(
            // This is a string.
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `${errorMessagePrefix}: RPC endpoint '${rpcEndpointFields.url}' refers to network client '${networkClientId}' that does not exist`);
        }
        if (networkFields.rpcEndpoints.some((otherRpcEndpointFields) => otherRpcEndpointFields !== rpcEndpointFields &&
            URI.equal(otherRpcEndpointFields.url, rpcEndpointFields.url))) {
            throw new Error(`${errorMessagePrefix}: Each entry in rpcEndpoints must have a unique URL`);
        }
        const networkConfigurationsForOtherChains = Object.values(this.state.networkConfigurationsByChainId).filter((networkConfiguration) => existingNetworkConfiguration
            ? networkConfiguration.chainId !==
                existingNetworkConfiguration.chainId
            : true);
        for (const networkConfiguration of networkConfigurationsForOtherChains) {
            const rpcEndpoint = networkConfiguration.rpcEndpoints.find((existingRpcEndpoint) => URI.equal(rpcEndpointFields.url, existingRpcEndpoint.url));
            if (rpcEndpoint) {
                if (mode === 'update') {
                    throw new Error(
                    // This ESLint rule mistakenly produces an error.
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    `Could not update network to point to same RPC endpoint as existing network for chain ${networkConfiguration.chainId} ('${networkConfiguration.name}')`);
                }
                else {
                    throw new Error(
                    // This ESLint rule mistakenly produces an error.
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    `Could not add network that points to same RPC endpoint as existing network for chain ${networkConfiguration.chainId} ('${networkConfiguration.name}')`);
                }
            }
        }
    }
    if ([...new Set(networkFields.rpcEndpoints)].length <
        networkFields.rpcEndpoints.length) {
        throw new Error(`${errorMessagePrefix}: Each entry in rpcEndpoints must be unique`);
    }
    const networkClientIds = networkFields.rpcEndpoints
        .map((rpcEndpoint) => 'networkClientId' in rpcEndpoint
        ? rpcEndpoint.networkClientId
        : undefined)
        .filter((networkClientId) => networkClientId !== undefined);
    if ([...new Set(networkClientIds)].length < networkClientIds.length) {
        throw new Error(`${errorMessagePrefix}: Each entry in rpcEndpoints must have a unique networkClientId`);
    }
    const infuraRpcEndpoints = networkFields.rpcEndpoints.filter((rpcEndpointFields) => rpcEndpointFields.type === RpcEndpointType.Infura);
    if (infuraRpcEndpoints.length > 1) {
        throw new Error(`${errorMessagePrefix}: There cannot be more than one Infura RPC endpoint`);
    }
    const soleInfuraRpcEndpoint = infuraRpcEndpoints[0];
    if (soleInfuraRpcEndpoint) {
        const infuraNetworkName = deriveInfuraNetworkNameFromRpcEndpointUrl(soleInfuraRpcEndpoint.url);
        const infuraNetworkNickname = controller_utils_1.NetworkNickname[infuraNetworkName];
        const infuraChainId = controller_utils_1.ChainId[infuraNetworkName];
        if (networkFields.chainId !== infuraChainId) {
            throw new Error(mode === 'add'
                ? // This is a string.
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    `Could not add network with chain ID ${networkFields.chainId} and Infura RPC endpoint for '${infuraNetworkNickname}' which represents ${infuraChainId}, as the two conflict`
                : // This is a string.
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    `Could not update network with chain ID ${networkFields.chainId} and Infura RPC endpoint for '${infuraNetworkNickname}' which represents ${infuraChainId}, as the two conflict`);
        }
    }
    if (networkFields.rpcEndpoints[networkFields.defaultRpcEndpointIndex] ===
        undefined) {
        throw new Error(`${errorMessagePrefix}: \`defaultRpcEndpointIndex\` must refer to an entry in \`rpcEndpoints\``);
    }
}, _NetworkController_determineNetworkConfigurationToPersist = function _NetworkController_determineNetworkConfigurationToPersist({ networkFields, networkClientOperations, }) {
    const rpcEndpointsToPersist = networkClientOperations
        .filter((networkClientOperation) => {
        return (networkClientOperation.type === 'add' ||
            networkClientOperation.type === 'noop');
    })
        .map((networkClientOperation) => networkClientOperation.rpcEndpoint)
        .concat(networkClientOperations
        .filter((networkClientOperation) => {
        return networkClientOperation.type === 'replace';
    })
        .map((networkClientOperation) => networkClientOperation.newRpcEndpoint));
    return { ...networkFields, rpcEndpoints: rpcEndpointsToPersist };
}, _NetworkController_registerNetworkClientsAsNeeded = function _NetworkController_registerNetworkClientsAsNeeded({ networkFields, networkClientOperations, autoManagedNetworkClientRegistry, }) {
    const addedRpcEndpoints = networkClientOperations
        .filter((networkClientOperation) => {
        return networkClientOperation.type === 'add';
    })
        .map((networkClientOperation) => networkClientOperation.rpcEndpoint)
        .concat(networkClientOperations
        .filter((networkClientOperation) => {
        return networkClientOperation.type === 'replace';
    })
        .map((networkClientOperation) => networkClientOperation.newRpcEndpoint));
    for (const addedRpcEndpoint of addedRpcEndpoints) {
        if (addedRpcEndpoint.type === RpcEndpointType.Infura) {
            autoManagedNetworkClientRegistry[types_1.NetworkClientType.Infura][addedRpcEndpoint.networkClientId] = (0, create_auto_managed_network_client_1.createAutoManagedNetworkClient)({
                networkClientConfiguration: {
                    type: types_1.NetworkClientType.Infura,
                    chainId: networkFields.chainId,
                    network: addedRpcEndpoint.networkClientId,
                    failoverRpcUrls: addedRpcEndpoint.failoverUrls,
                    infuraProjectId: __classPrivateFieldGet(this, _NetworkController_infuraProjectId, "f"),
                    ticker: networkFields.nativeCurrency,
                },
                getRpcServiceOptions: __classPrivateFieldGet(this, _NetworkController_getRpcServiceOptions, "f"),
                getBlockTrackerOptions: __classPrivateFieldGet(this, _NetworkController_getBlockTrackerOptions, "f"),
                messenger: this.messagingSystem,
                isRpcFailoverEnabled: __classPrivateFieldGet(this, _NetworkController_isRpcFailoverEnabled, "f"),
            });
        }
        else {
            autoManagedNetworkClientRegistry[types_1.NetworkClientType.Custom][addedRpcEndpoint.networkClientId] = (0, create_auto_managed_network_client_1.createAutoManagedNetworkClient)({
                networkClientConfiguration: {
                    type: types_1.NetworkClientType.Custom,
                    chainId: networkFields.chainId,
                    failoverRpcUrls: addedRpcEndpoint.failoverUrls,
                    rpcUrl: addedRpcEndpoint.url,
                    ticker: networkFields.nativeCurrency,
                },
                getRpcServiceOptions: __classPrivateFieldGet(this, _NetworkController_getRpcServiceOptions, "f"),
                getBlockTrackerOptions: __classPrivateFieldGet(this, _NetworkController_getBlockTrackerOptions, "f"),
                messenger: this.messagingSystem,
                isRpcFailoverEnabled: __classPrivateFieldGet(this, _NetworkController_isRpcFailoverEnabled, "f"),
            });
        }
    }
}, _NetworkController_unregisterNetworkClientsAsNeeded = function _NetworkController_unregisterNetworkClientsAsNeeded({ networkClientOperations, autoManagedNetworkClientRegistry, }) {
    const removedRpcEndpoints = networkClientOperations
        .filter((networkClientOperation) => {
        return networkClientOperation.type === 'remove';
    })
        .map((networkClientOperation) => networkClientOperation.rpcEndpoint)
        .concat(networkClientOperations
        .filter((networkClientOperation) => {
        return networkClientOperation.type === 'replace';
    })
        .map((networkClientOperation) => networkClientOperation.oldRpcEndpoint));
    for (const rpcEndpoint of removedRpcEndpoints) {
        const networkClient = this.getNetworkClientById(rpcEndpoint.networkClientId);
        networkClient.destroy();
        delete autoManagedNetworkClientRegistry[networkClient.configuration.type][rpcEndpoint.networkClientId];
    }
}, _NetworkController_updateNetworkConfigurations = function _NetworkController_updateNetworkConfigurations(args) {
    const { state, mode } = args;
    if (mode === 'remove' ||
        (mode === 'update' &&
            args.networkFields.chainId !==
                args.existingNetworkConfiguration.chainId)) {
        delete state.networkConfigurationsByChainId[args.existingNetworkConfiguration.chainId];
    }
    if (mode === 'add' || mode === 'update') {
        if (!(0, fast_deep_equal_1.default)(state.networkConfigurationsByChainId[args.networkFields.chainId], args.networkConfigurationToPersist)) {
            args.networkConfigurationToPersist.lastUpdatedAt = Date.now();
        }
        state.networkConfigurationsByChainId[args.networkFields.chainId] =
            args.networkConfigurationToPersist;
    }
    __classPrivateFieldSet(this, _NetworkController_networkConfigurationsByNetworkClientId, buildNetworkConfigurationsByNetworkClientId((0, lodash_1.cloneDeep)(state.networkConfigurationsByChainId)), "f");
}, _NetworkController_ensureAutoManagedNetworkClientRegistryPopulated = function _NetworkController_ensureAutoManagedNetworkClientRegistryPopulated() {
    return (__classPrivateFieldSet(this, _NetworkController_autoManagedNetworkClientRegistry, __classPrivateFieldGet(this, _NetworkController_autoManagedNetworkClientRegistry, "f") ?? __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_createAutoManagedNetworkClientRegistry).call(this), "f"));
}, _NetworkController_createAutoManagedNetworkClientRegistry = function _NetworkController_createAutoManagedNetworkClientRegistry() {
    const chainIds = knownKeysOf(this.state.networkConfigurationsByChainId);
    const networkClientsWithIds = chainIds.flatMap((chainId) => {
        const networkConfiguration = this.state.networkConfigurationsByChainId[chainId];
        return networkConfiguration.rpcEndpoints.map((rpcEndpoint) => {
            if (rpcEndpoint.type === RpcEndpointType.Infura) {
                const infuraNetworkName = deriveInfuraNetworkNameFromRpcEndpointUrl(rpcEndpoint.url);
                return [
                    rpcEndpoint.networkClientId,
                    (0, create_auto_managed_network_client_1.createAutoManagedNetworkClient)({
                        networkClientConfiguration: {
                            type: types_1.NetworkClientType.Infura,
                            network: infuraNetworkName,
                            failoverRpcUrls: rpcEndpoint.failoverUrls,
                            infuraProjectId: __classPrivateFieldGet(this, _NetworkController_infuraProjectId, "f"),
                            chainId: networkConfiguration.chainId,
                            ticker: networkConfiguration.nativeCurrency,
                        },
                        getRpcServiceOptions: __classPrivateFieldGet(this, _NetworkController_getRpcServiceOptions, "f"),
                        getBlockTrackerOptions: __classPrivateFieldGet(this, _NetworkController_getBlockTrackerOptions, "f"),
                        messenger: this.messagingSystem,
                        isRpcFailoverEnabled: __classPrivateFieldGet(this, _NetworkController_isRpcFailoverEnabled, "f"),
                    }),
                ];
            }
            return [
                rpcEndpoint.networkClientId,
                (0, create_auto_managed_network_client_1.createAutoManagedNetworkClient)({
                    networkClientConfiguration: {
                        type: types_1.NetworkClientType.Custom,
                        chainId: networkConfiguration.chainId,
                        failoverRpcUrls: rpcEndpoint.failoverUrls,
                        rpcUrl: rpcEndpoint.url,
                        ticker: networkConfiguration.nativeCurrency,
                    },
                    getRpcServiceOptions: __classPrivateFieldGet(this, _NetworkController_getRpcServiceOptions, "f"),
                    getBlockTrackerOptions: __classPrivateFieldGet(this, _NetworkController_getBlockTrackerOptions, "f"),
                    messenger: this.messagingSystem,
                    isRpcFailoverEnabled: __classPrivateFieldGet(this, _NetworkController_isRpcFailoverEnabled, "f"),
                }),
            ];
        });
    });
    return networkClientsWithIds.reduce((obj, [networkClientId, networkClient]) => {
        return {
            ...obj,
            [networkClient.configuration.type]: {
                ...obj[networkClient.configuration.type],
                [networkClientId]: networkClient,
            },
        };
    }, {
        [types_1.NetworkClientType.Custom]: {},
        [types_1.NetworkClientType.Infura]: {},
    });
}, _NetworkController_applyNetworkSelection = function _NetworkController_applyNetworkSelection(networkClientId, { updateState, } = {}) {
    const autoManagedNetworkClientRegistry = __classPrivateFieldGet(this, _NetworkController_instances, "m", _NetworkController_ensureAutoManagedNetworkClientRegistryPopulated).call(this);
    let autoManagedNetworkClient;
    if ((0, controller_utils_1.isInfuraNetworkType)(networkClientId)) {
        const possibleAutoManagedNetworkClient = autoManagedNetworkClientRegistry[types_1.NetworkClientType.Infura][networkClientId];
        // This is impossible to reach
        /* istanbul ignore if */
        if (!possibleAutoManagedNetworkClient) {
            throw new Error(`No Infura network client found with ID '${networkClientId}'`);
        }
        autoManagedNetworkClient = possibleAutoManagedNetworkClient;
    }
    else {
        const possibleAutoManagedNetworkClient = autoManagedNetworkClientRegistry[types_1.NetworkClientType.Custom][networkClientId];
        if (!possibleAutoManagedNetworkClient) {
            throw new Error(`No network client found with ID '${networkClientId}'`);
        }
        autoManagedNetworkClient = possibleAutoManagedNetworkClient;
    }
    __classPrivateFieldSet(this, _NetworkController_autoManagedNetworkClient, autoManagedNetworkClient, "f");
    this.update((state) => {
        state.selectedNetworkClientId = networkClientId;
        if (state.networksMetadata[networkClientId] === undefined) {
            state.networksMetadata[networkClientId] = {
                status: constants_1.NetworkStatus.Unknown,
                EIPS: {},
            };
        }
        updateState?.(state);
    });
    if (__classPrivateFieldGet(this, _NetworkController_providerProxy, "f")) {
        __classPrivateFieldGet(this, _NetworkController_providerProxy, "f").setTarget(__classPrivateFieldGet(this, _NetworkController_autoManagedNetworkClient, "f").provider);
    }
    else {
        __classPrivateFieldSet(this, _NetworkController_providerProxy, (0, swappable_obj_proxy_1.createEventEmitterProxy)(__classPrivateFieldGet(this, _NetworkController_autoManagedNetworkClient, "f").provider), "f");
    }
    if (__classPrivateFieldGet(this, _NetworkController_blockTrackerProxy, "f")) {
        __classPrivateFieldGet(this, _NetworkController_blockTrackerProxy, "f").setTarget(__classPrivateFieldGet(this, _NetworkController_autoManagedNetworkClient, "f").blockTracker);
    }
    else {
        __classPrivateFieldSet(this, _NetworkController_blockTrackerProxy, (0, swappable_obj_proxy_1.createEventEmitterProxy)(__classPrivateFieldGet(this, _NetworkController_autoManagedNetworkClient, "f").blockTracker, { eventFilter: 'skipInternal' }), "f");
    }
    __classPrivateFieldSet(this, _NetworkController_ethQuery, new eth_query_1.default(__classPrivateFieldGet(this, _NetworkController_providerProxy, "f")), "f");
};
//# sourceMappingURL=NetworkController.cjs.map