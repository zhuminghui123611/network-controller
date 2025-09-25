import type { ControllerGetStateAction, ControllerStateChangeEvent, RestrictedMessenger } from "@metamask/base-controller";
import { BaseController } from "@metamask/base-controller";
import type { Partialize } from "@metamask/controller-utils";
import { InfuraNetworkType } from "@metamask/controller-utils";
import type { ErrorReportingServiceCaptureExceptionAction } from "@metamask/error-reporting-service";
import type { PollingBlockTrackerOptions } from "@metamask/eth-block-tracker";
import EthQuery from "@metamask/eth-query";
import type { SwappableProxy } from "@metamask/swappable-obj-proxy";
import type { Hex } from "@metamask/utils";
import type { Draft } from "immer";
import type { Logger } from "loglevel";
import { NetworkStatus } from "./constants.mjs";
import type { AutoManagedNetworkClient, ProxyWithAccessibleTarget } from "./create-auto-managed-network-client.mjs";
import type { RpcServiceOptions } from "./rpc-service/rpc-service.mjs";
import { NetworkClientType } from "./types.mjs";
import type { BlockTracker, Provider, CustomNetworkClientConfiguration, InfuraNetworkClientConfiguration, AdditionalDefaultNetwork } from "./types.mjs";
export type Block = {
    baseFeePerGas?: string;
};
/**
 * Information about a network not held by any other part of state.
 */
export type NetworkMetadata = {
    /**
     * EIPs supported by the network.
     */
    EIPS: {
        [eipNumber: number]: boolean;
    };
    /**
     * Indicates the availability of the network
     */
    status: NetworkStatus;
};
/**
 * The type of an RPC endpoint.
 *
 * @see {@link CustomRpcEndpoint}
 * @see {@link InfuraRpcEndpoint}
 */
export declare enum RpcEndpointType {
    Custom = "custom",
    Infura = "infura"
}
/**
 * An Infura RPC endpoint is a reference to a specific network that Infura
 * supports as well as an Infura account we own that we allow users to make use
 * of for free. We need to disambiguate these endpoints from custom RPC
 * endpoints, because while the types for these kinds of object both have the
 * same interface, the URL for an Infura endpoint contains the Infura project
 * ID, and we don't want this to be present in state. We therefore hide it by
 * representing it in the URL as `{infuraProjectId}`, which we replace this when
 * create network clients. But we need to know somehow that we only need to do
 * this replacement for Infura endpoints and not custom endpoints — hence the
 * separate type.
 */
export type InfuraRpcEndpoint = {
    /**
     * Alternate RPC endpoints to use when this endpoint is down.
     */
    failoverUrls?: string[];
    /**
     * The optional user-facing nickname of the endpoint.
     */
    name?: string;
    /**
     * The identifier for the network client that has been created for this RPC
     * endpoint. This is also used to uniquely identify the RPC endpoint in a
     * set of RPC endpoints as well: once assigned, it is used to determine
     * whether the `name`, `type`, or `url` of the RPC endpoint has changed.
     */
    networkClientId: BuiltInNetworkClientId;
    /**
     * The type of this endpoint, always "default".
     */
    type: RpcEndpointType.Infura;
    /**
     * The URL of the endpoint. Expected to be a template with the string
     * `{infuraProjectId}`, which will get replaced with the Infura project ID
     * when the network client is created.
     */
    url: `https://${InfuraNetworkType}.infura.io/v3/{infuraProjectId}`;
};
/**
 * A custom RPC endpoint is a reference to a user-defined server which fronts an
 * EVM chain. It may refer to an Infura network, but only by coincidence.
 */
export type CustomRpcEndpoint = {
    /**
     * Alternate RPC endpoints to use when this endpoint is down.
     */
    failoverUrls?: string[];
    /**
     * The optional user-facing nickname of the endpoint.
     */
    name?: string;
    /**
     * The identifier for the network client that has been created for this RPC
     * endpoint. This is also used to uniquely identify the RPC endpoint in a
     * set of RPC endpoints as well: once assigned, it is used to determine
     * whether the `name`, `type`, or `url` of the RPC endpoint has changed.
     */
    networkClientId: CustomNetworkClientId;
    /**
     * The type of this endpoint, always "custom".
     */
    type: RpcEndpointType.Custom;
    /**
     * The URL of the endpoint.
     */
    url: string;
};
/**
 * An RPC endpoint is a reference to a server which fronts an EVM chain. There
 * are two varieties of RPC endpoints: Infura and custom.
 *
 * @see {@link CustomRpcEndpoint}
 * @see {@link InfuraRpcEndpoint}
 */
export type RpcEndpoint = InfuraRpcEndpoint | CustomRpcEndpoint;
/**
 * From a user perspective, a network configuration holds information about a
 * network that a user can select through the client. A "network" in this sense
 * can explicitly refer to an EVM chain that the user explicitly adds or doesn't
 * need to add (because it comes shipped with the client). The properties here
 * therefore directly map to fields that a user sees and can edit for a network
 * within the client.
 *
 * Internally, a network configuration represents a single conceptual EVM chain,
 * which is represented tangibly via multiple RPC endpoints. A "network" is then
 * something for which a network client object is created automatically or
 * created on demand when it is added to the client.
 */
export type NetworkConfiguration = {
    /**
     * A set of URLs that allows the user to view activity that has occurred on
     * the chain.
     */
    blockExplorerUrls: string[];
    /**
     * The ID of the chain. Represented in hexadecimal format with a leading "0x"
     * instead of decimal format so that when viewed out of context it can be
     * unambiguously interpreted.
     */
    chainId: Hex;
    /**
     * A reference to a URL that the client will use by default to allow the user
     * to view activity that has occurred on the chain. This index must refer to
     * an item in `blockExplorerUrls`.
     */
    defaultBlockExplorerUrlIndex?: number;
    /**
     * A reference to an RPC endpoint that all requests will use by default in order to
     * interact with the chain. This index must refer to an item in
     * `rpcEndpoints`.
     */
    defaultRpcEndpointIndex: number;
    /**
     * The user-facing nickname assigned to the chain.
     */
    name: string;
    /**
     * The name of the currency to use for the chain.
     */
    nativeCurrency: string;
    /**
     * The collection of possible RPC endpoints that the client can use to
     * interact with the chain.
     */
    rpcEndpoints: RpcEndpoint[];
    /**
     * Profile Sync - Network Sync field.
     * Allows comparison of local network state with state to sync.
     */
    lastUpdatedAt?: number;
};
/**
 * A custom RPC endpoint in a new network configuration, meant to be used in
 * conjunction with `AddNetworkFields`.
 *
 * Custom RPC endpoints do not need a `networkClientId` property because it is
 * assumed that they have not already been added and therefore network clients
 * do not exist for them yet (and hence IDs need to be generated).
 */
export type AddNetworkCustomRpcEndpointFields = Omit<CustomRpcEndpoint, 'networkClientId'>;
/**
 * A new network configuration that `addNetwork` takes.
 *
 * Custom RPC endpoints do not need a `networkClientId` property because it is
 * assumed that they have not already been added and are not represented by
 * network clients yet.
 */
export type AddNetworkFields = Omit<NetworkConfiguration, 'rpcEndpoints'> & {
    rpcEndpoints: (InfuraRpcEndpoint | AddNetworkCustomRpcEndpointFields)[];
};
/**
 * A custom RPC endpoint in an updated representation of a network
 * configuration, meant to be used in conjunction with `UpdateNetworkFields`.
 *
 * Custom RPC endpoints do not need a `networkClientId` property because it is
 * assumed that they have not already been added and therefore network clients
 * do not exist for them yet (and hence IDs need to be generated).
 */
export type UpdateNetworkCustomRpcEndpointFields = Partialize<CustomRpcEndpoint, 'networkClientId'>;
/**
 * An updated representation of an existing network configuration that
 * `updateNetwork` takes.
 *
 * Custom RPC endpoints may or may not have a `networkClientId` property; if
 * they do, then it is assumed that they already exist, and if not, then it is
 * assumed that they are new and are not represented by network clients yet.
 */
export type UpdateNetworkFields = Omit<NetworkConfiguration, 'rpcEndpoints'> & {
    rpcEndpoints: (InfuraRpcEndpoint | UpdateNetworkCustomRpcEndpointFields)[];
};
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
export declare function knownKeysOf<K extends PropertyKey>(object: Partial<Record<K, any>>): K[];
/**
 * The string that uniquely identifies an Infura network client.
 */
export type BuiltInNetworkClientId = InfuraNetworkType;
/**
 * The string that uniquely identifies a custom network client.
 */
export type CustomNetworkClientId = string;
/**
 * The string that uniquely identifies a network client.
 */
export type NetworkClientId = BuiltInNetworkClientId | CustomNetworkClientId;
/**
 * Extra information about each network, such as whether it is accessible or
 * blocked and whether it supports EIP-1559, keyed by network client ID.
 */
export type NetworksMetadata = Record<NetworkClientId, NetworkMetadata>;
/**
 * The state that NetworkController stores.
 */
export type NetworkState = {
    /**
     * The ID of the network client that the proxies returned by
     * `getSelectedNetworkClient` currently point to.
     */
    selectedNetworkClientId: NetworkClientId;
    /**
     * The registry of networks and corresponding RPC endpoints that the
     * controller can use to make requests for various chains.
     *
     * @see {@link NetworkConfiguration}
     */
    networkConfigurationsByChainId: Record<Hex, NetworkConfiguration>;
    /**
     * Extra information about each network, such as whether it is accessible or
     * blocked and whether it supports EIP-1559, keyed by network client ID.
     */
    networksMetadata: NetworksMetadata;
};
declare const controllerName = "NetworkController";
/**
 * Represents the block tracker for the currently selected network. (Note that
 * this is a proxy around a proxy: the inner one exists so that the block
 * tracker doesn't have to exist until it's used, and the outer one exists so
 * that the currently selected network can change without consumers needing to
 * refresh the object reference to that network.)
 */
export type BlockTrackerProxy = SwappableProxy<ProxyWithAccessibleTarget<BlockTracker>>;
/**
 * Represents the provider for the currently selected network. (Note that this
 * is a proxy around a proxy: the inner one exists so that the provider doesn't
 * have to exist until it's used, and the outer one exists so that the currently
 * selected network can change without consumers needing to refresh the object
 * reference to that network.)
 */
export type ProviderProxy = SwappableProxy<ProxyWithAccessibleTarget<Provider>>;
export type NetworkControllerStateChangeEvent = ControllerStateChangeEvent<typeof controllerName, NetworkState>;
/**
 * `networkWillChange` is published when the current network is about to be
 * switched, but the new provider has not been created and no state changes have
 * occurred yet.
 */
export type NetworkControllerNetworkWillChangeEvent = {
    type: 'NetworkController:networkWillChange';
    payload: [NetworkState];
};
/**
 * `networkDidChange` is published after a provider has been created for a newly
 * switched network (but before the network has been confirmed to be available).
 */
export type NetworkControllerNetworkDidChangeEvent = {
    type: 'NetworkController:networkDidChange';
    payload: [NetworkState];
};
/**
 * `infuraIsBlocked` is published after the network is switched to an Infura
 * network, but when Infura returns an error blocking the user based on their
 * location.
 */
export type NetworkControllerInfuraIsBlockedEvent = {
    type: 'NetworkController:infuraIsBlocked';
    payload: [];
};
/**
 * `infuraIsBlocked` is published either after the network is switched to an
 * Infura network and Infura does not return an error blocking the user based on
 * their location, or the network is switched to a non-Infura network.
 */
export type NetworkControllerInfuraIsUnblockedEvent = {
    type: 'NetworkController:infuraIsUnblocked';
    payload: [];
};
/**
 * `networkAdded` is published after a network configuration is added to the
 * network configuration registry and network clients are created for it.
 */
export type NetworkControllerNetworkAddedEvent = {
    type: 'NetworkController:networkAdded';
    payload: [networkConfiguration: NetworkConfiguration];
};
/**
 * `networkRemoved` is published after a network configuration is removed from the
 * network configuration registry and once the network clients have been removed.
 */
export type NetworkControllerNetworkRemovedEvent = {
    type: 'NetworkController:networkRemoved';
    payload: [networkConfiguration: NetworkConfiguration];
};
/**
 * `rpcEndpointUnavailable` is published after an attempt to make a request to
 * an RPC endpoint fails too many times in a row (because of a connection error
 * or an unusable response).
 */
export type NetworkControllerRpcEndpointUnavailableEvent = {
    type: 'NetworkController:rpcEndpointUnavailable';
    payload: [
        {
            chainId: Hex;
            endpointUrl: string;
            failoverEndpointUrl?: string;
            error: unknown;
        }
    ];
};
/**
 * `rpcEndpointDegraded` is published after a request to an RPC endpoint
 * responds successfully but takes too long.
 */
export type NetworkControllerRpcEndpointDegradedEvent = {
    type: 'NetworkController:rpcEndpointDegraded';
    payload: [
        {
            chainId: Hex;
            endpointUrl: string;
            error: unknown;
        }
    ];
};
/**
 * `rpcEndpointRequestRetried` is published after a request to an RPC endpoint
 * is retried following a connection error or an unusable response.
 */
export type NetworkControllerRpcEndpointRequestRetriedEvent = {
    type: 'NetworkController:rpcEndpointRequestRetried';
    payload: [
        {
            endpointUrl: string;
            attempt: number;
        }
    ];
};
export type NetworkControllerEvents = NetworkControllerStateChangeEvent | NetworkControllerNetworkWillChangeEvent | NetworkControllerNetworkDidChangeEvent | NetworkControllerInfuraIsBlockedEvent | NetworkControllerInfuraIsUnblockedEvent | NetworkControllerNetworkAddedEvent | NetworkControllerNetworkRemovedEvent | NetworkControllerRpcEndpointUnavailableEvent | NetworkControllerRpcEndpointDegradedEvent | NetworkControllerRpcEndpointRequestRetriedEvent;
/**
 * All events that {@link NetworkController} calls internally.
 */
type AllowedEvents = never;
export type NetworkControllerGetStateAction = ControllerGetStateAction<typeof controllerName, NetworkState>;
export type NetworkControllerGetEthQueryAction = {
    type: `NetworkController:getEthQuery`;
    handler: () => EthQuery | undefined;
};
export type NetworkControllerGetNetworkClientByIdAction = {
    type: `NetworkController:getNetworkClientById`;
    handler: NetworkController['getNetworkClientById'];
};
export type NetworkControllerGetSelectedNetworkClientAction = {
    type: `NetworkController:getSelectedNetworkClient`;
    handler: NetworkController['getSelectedNetworkClient'];
};
export type NetworkControllerGetSelectedChainIdAction = {
    type: 'NetworkController:getSelectedChainId';
    handler: NetworkController['getSelectedChainId'];
};
export type NetworkControllerGetEIP1559CompatibilityAction = {
    type: `NetworkController:getEIP1559Compatibility`;
    handler: NetworkController['getEIP1559Compatibility'];
};
export type NetworkControllerFindNetworkClientIdByChainIdAction = {
    type: `NetworkController:findNetworkClientIdByChainId`;
    handler: NetworkController['findNetworkClientIdByChainId'];
};
/**
 * Change the currently selected network to the given built-in network type.
 *
 * @deprecated This action has been replaced by `setActiveNetwork`, and will be
 * removed in a future release.
 */
export type NetworkControllerSetProviderTypeAction = {
    type: `NetworkController:setProviderType`;
    handler: NetworkController['setProviderType'];
};
export type NetworkControllerSetActiveNetworkAction = {
    type: `NetworkController:setActiveNetwork`;
    handler: NetworkController['setActiveNetwork'];
};
export type NetworkControllerGetNetworkConfigurationByChainId = {
    type: `NetworkController:getNetworkConfigurationByChainId`;
    handler: NetworkController['getNetworkConfigurationByChainId'];
};
export type NetworkControllerGetNetworkConfigurationByNetworkClientId = {
    type: `NetworkController:getNetworkConfigurationByNetworkClientId`;
    handler: NetworkController['getNetworkConfigurationByNetworkClientId'];
};
export type NetworkControllerAddNetworkAction = {
    type: 'NetworkController:addNetwork';
    handler: NetworkController['addNetwork'];
};
export type NetworkControllerRemoveNetworkAction = {
    type: 'NetworkController:removeNetwork';
    handler: NetworkController['removeNetwork'];
};
export type NetworkControllerUpdateNetworkAction = {
    type: 'NetworkController:updateNetwork';
    handler: NetworkController['updateNetwork'];
};
export type NetworkControllerActions = NetworkControllerGetStateAction | NetworkControllerGetEthQueryAction | NetworkControllerGetNetworkClientByIdAction | NetworkControllerGetSelectedNetworkClientAction | NetworkControllerGetSelectedChainIdAction | NetworkControllerGetEIP1559CompatibilityAction | NetworkControllerFindNetworkClientIdByChainIdAction | NetworkControllerSetActiveNetworkAction | NetworkControllerSetProviderTypeAction | NetworkControllerGetNetworkConfigurationByChainId | NetworkControllerGetNetworkConfigurationByNetworkClientId | NetworkControllerAddNetworkAction | NetworkControllerRemoveNetworkAction | NetworkControllerUpdateNetworkAction;
/**
 * All actions that {@link NetworkController} calls internally.
 */
type AllowedActions = ErrorReportingServiceCaptureExceptionAction;
export type NetworkControllerMessenger = RestrictedMessenger<typeof controllerName, NetworkControllerActions | AllowedActions, NetworkControllerEvents | AllowedEvents, AllowedActions['type'], AllowedEvents['type']>;
/**
 * Options for the NetworkController constructor.
 */
export type NetworkControllerOptions = {
    /**
     * The messenger suited for this controller.
     */
    messenger: NetworkControllerMessenger;
    /**
     * The API key for Infura, used to make requests to Infura.
     */
    infuraProjectId: string;
    /**
     * The desired state with which to initialize this controller.
     * Missing properties will be filled in with defaults. For instance, if not
     * specified, `networkConfigurationsByChainId` will default to a basic set of
     * network configurations (see {@link InfuraNetworkType} for the list).
     */
    state?: Partial<NetworkState>;
    /**
     * A `loglevel` logger object.
     */
    log?: Logger;
    /**
     * A function that can be used to customize a RPC service constructed for an
     * RPC endpoint. The function takes the URL of the endpoint and should return
     * an object with type {@link RpcServiceOptions}, minus `failoverService`
     * and `endpointUrl` (as they are filled in automatically).
     */
    getRpcServiceOptions: (rpcEndpointUrl: string) => Omit<RpcServiceOptions, 'failoverService' | 'endpointUrl'>;
    /**
     * A function that can be used to customize a block tracker constructed for an
     * RPC endpoint. The function takes the URL of the endpoint and should return
     * an object of type {@link PollingBlockTrackerOptions}, minus `provider` (as
     * it is filled in automatically).
     */
    getBlockTrackerOptions?: (rpcEndpointUrl: string) => Omit<PollingBlockTrackerOptions, 'provider'>;
    /**
     * An array of Hex Chain IDs representing the additional networks to be included as default.
     */
    additionalDefaultNetworks?: AdditionalDefaultNetwork[];
    /**
     * Whether or not requests sent to unavailable RPC endpoints should be
     * automatically diverted to configured failover RPC endpoints.
     */
    isRpcFailoverEnabled?: boolean;
};
/**
 * Constructs properties for the NetworkController state whose values will be
 * used if not provided to the constructor.
 *
 * @param [additionalDefaultNetworks] - An array of Hex Chain IDs representing the additional networks to be included as default.
 * @returns The default NetworkController state.
 */
export declare function getDefaultNetworkControllerState(additionalDefaultNetworks?: AdditionalDefaultNetwork[]): NetworkState;
/**
 * Get a list of all network configurations.
 *
 * @param state - NetworkController state
 * @returns A list of all available network configurations
 */
export declare function getNetworkConfigurations(state: NetworkState): NetworkConfiguration[];
/**
 * Redux selector for getting a list of all network configurations from
 * NetworkController state.
 *
 * @param state - NetworkController state
 * @returns A list of all available network configurations
 */
export declare const selectNetworkConfigurations: ((state: NetworkState) => NetworkConfiguration[]) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: Record<`0x${string}`, NetworkConfiguration>) => NetworkConfiguration[];
    memoizedResultFunc: ((resultFuncArgs_0: Record<`0x${string}`, NetworkConfiguration>) => NetworkConfiguration[]) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => NetworkConfiguration[];
    dependencies: [(state: NetworkState) => Record<`0x${string}`, NetworkConfiguration>];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
/**
 * Get a list of all available network client IDs from a list of network
 * configurations.
 *
 * @param networkConfigurations - The array of network configurations
 * @returns A list of all available client IDs
 */
export declare function getAvailableNetworkClientIds(networkConfigurations: NetworkConfiguration[]): string[];
/**
 * Redux selector for getting a list of all available network client IDs
 * from NetworkController state.
 *
 * @param state - NetworkController state
 * @returns A list of all available network client IDs.
 */
export declare const selectAvailableNetworkClientIds: ((state: NetworkState) => string[]) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: NetworkConfiguration[]) => string[];
    memoizedResultFunc: ((resultFuncArgs_0: NetworkConfiguration[]) => string[]) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => string[];
    dependencies: [((state: NetworkState) => NetworkConfiguration[]) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    } & {
        resultFunc: (resultFuncArgs_0: Record<`0x${string}`, NetworkConfiguration>) => NetworkConfiguration[];
        memoizedResultFunc: ((resultFuncArgs_0: Record<`0x${string}`, NetworkConfiguration>) => NetworkConfiguration[]) & {
            clearCache: () => void;
            resultsCount: () => number;
            resetResultsCount: () => void;
        };
        lastResult: () => NetworkConfiguration[];
        dependencies: [(state: NetworkState) => Record<`0x${string}`, NetworkConfiguration>];
        recomputations: () => number;
        resetRecomputations: () => void;
        dependencyRecomputations: () => number;
        resetDependencyRecomputations: () => void;
    } & {
        argsMemoize: typeof import("reselect").weakMapMemoize;
        memoize: typeof import("reselect").weakMapMemoize;
    }];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
/**
 * The collection of auto-managed network clients that map to Infura networks.
 */
export type AutoManagedBuiltInNetworkClientRegistry = Record<BuiltInNetworkClientId, AutoManagedNetworkClient<InfuraNetworkClientConfiguration>>;
/**
 * The collection of auto-managed network clients that map to Infura networks.
 */
export type AutoManagedCustomNetworkClientRegistry = Record<CustomNetworkClientId, AutoManagedNetworkClient<CustomNetworkClientConfiguration>>;
/**
 * The collection of auto-managed network clients that map to Infura networks
 * as well as custom networks that users have added.
 */
export type AutoManagedNetworkClientRegistry = {
    [NetworkClientType.Infura]: AutoManagedBuiltInNetworkClientRegistry;
    [NetworkClientType.Custom]: AutoManagedCustomNetworkClientRegistry;
};
/**
 * Controller that creates and manages an Ethereum network provider.
 */
export declare class NetworkController extends BaseController<typeof controllerName, NetworkState, NetworkControllerMessenger> {
    #private;
    /**
     * Constructs a NetworkController.
     *
     * @param options - The options; see {@link NetworkControllerOptions}.
     */
    constructor(options: NetworkControllerOptions);
    /**
     * Enables the RPC failover functionality. That is, if any RPC endpoints are
     * configured with failover URLs, then traffic will automatically be diverted
     * to them if those RPC endpoints are unavailable.
     */
    enableRpcFailover(): void;
    /**
     * Disables the RPC failover functionality. That is, even if any RPC endpoints
     * are configured with failover URLs, then traffic will not automatically be
     * diverted to them if those RPC endpoints are unavailable.
     */
    disableRpcFailover(): void;
    /**
     * Accesses the provider and block tracker for the currently selected network.
     * @returns The proxy and block tracker proxies.
     * @deprecated This method has been replaced by `getSelectedNetworkClient` (which has a more easily used return type) and will be removed in a future release.
     */
    getProviderAndBlockTracker(): {
        provider: SwappableProxy<ProxyWithAccessibleTarget<Provider>> | undefined;
        blockTracker: SwappableProxy<ProxyWithAccessibleTarget<BlockTracker>> | undefined;
    };
    /**
     * Accesses the provider and block tracker for the currently selected network.
     *
     * @returns an object with the provider and block tracker proxies for the currently selected network.
     */
    getSelectedNetworkClient(): {
        provider: SwappableProxy<ProxyWithAccessibleTarget<Provider>>;
        blockTracker: SwappableProxy<ProxyWithAccessibleTarget<BlockTracker>>;
    } | undefined;
    /**
     * Accesses the chain ID from the selected network client.
     *
     * @returns The chain ID of the selected network client in hex format or undefined if there is no network client.
     */
    getSelectedChainId(): Hex | undefined;
    /**
     * Internally, the Infura and custom network clients are categorized by type
     * so that when accessing either kind of network client, TypeScript knows
     * which type to assign to the network client. For some cases it's more useful
     * to be able to access network clients by ID instead of by type and then ID,
     * so this function makes that possible.
     *
     * @returns The network clients registered so far, keyed by ID.
     */
    getNetworkClientRegistry(): AutoManagedBuiltInNetworkClientRegistry & AutoManagedCustomNetworkClientRegistry;
    /**
     * Returns the Infura network client with the given ID.
     *
     * @param infuraNetworkClientId - An Infura network client ID.
     * @returns The Infura network client.
     * @throws If an Infura network client does not exist with the given ID.
     */
    getNetworkClientById(infuraNetworkClientId: BuiltInNetworkClientId): AutoManagedNetworkClient<InfuraNetworkClientConfiguration>;
    /**
     * Returns the custom network client with the given ID.
     *
     * @param customNetworkClientId - A custom network client ID.
     * @returns The custom network client.
     * @throws If a custom network client does not exist with the given ID.
     */
    getNetworkClientById(customNetworkClientId: CustomNetworkClientId): AutoManagedNetworkClient<CustomNetworkClientConfiguration>;
    /**
     * Ensures that network clients for Infura and custom RPC endpoints have been
     * created. Then, consulting state, initializes and establishes the currently
     * selected network client.
     */
    initializeProvider(): Promise<void>;
    /**
     * Refreshes the network meta with EIP-1559 support and the network status
     * based on the given network client ID.
     *
     * @param networkClientId - The ID of the network client to update.
     */
    lookupNetworkByClientId(networkClientId: NetworkClientId): Promise<void>;
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
    lookupNetwork(networkClientId?: NetworkClientId): Promise<void>;
    /**
     * Convenience method to update provider network type settings.
     *
     * @param type - Human readable network name.
     * @deprecated This has been replaced by `setActiveNetwork`, and will be
     * removed in a future release
     */
    setProviderType(type: InfuraNetworkType): Promise<void>;
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
    setActiveNetwork(networkClientId: string, options?: {
        updateState?: (state: Draft<NetworkState>) => void;
    }): Promise<void>;
    /**
     * Determines whether the network supports EIP-1559 by checking whether the
     * latest block has a `baseFeePerGas` property, then updates state
     * appropriately.
     *
     * @param networkClientId - The networkClientId to fetch the correct provider against which to check 1559 compatibility.
     * @returns A promise that resolves to true if the network supports EIP-1559
     * , false otherwise, or `undefined` if unable to determine the compatibility.
     */
    getEIP1559Compatibility(networkClientId?: NetworkClientId): Promise<boolean | undefined>;
    get1559CompatibilityWithNetworkClientId(networkClientId: NetworkClientId): Promise<boolean>;
    /**
     * Ensures that the provider and block tracker proxies are pointed to the
     * currently selected network and refreshes the metadata for the
     */
    resetConnection(): Promise<void>;
    /**
     * Returns the network configuration that has been filed under the given chain
     * ID.
     *
     * @param chainId - The chain ID to use as a key.
     * @returns The network configuration if one exists, or undefined.
     */
    getNetworkConfigurationByChainId(chainId: Hex): NetworkConfiguration | undefined;
    /**
     * Returns the network configuration that contains an RPC endpoint with the
     * given network client ID.
     *
     * @param networkClientId - The network client ID to use as a key.
     * @returns The network configuration if one exists, or undefined.
     */
    getNetworkConfigurationByNetworkClientId(networkClientId: NetworkClientId): NetworkConfiguration | undefined;
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
    addNetwork(fields: AddNetworkFields): NetworkConfiguration;
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
    updateNetwork(chainId: Hex, fields: UpdateNetworkFields, { replacementSelectedRpcEndpointIndex, }?: {
        replacementSelectedRpcEndpointIndex?: number;
    }): Promise<NetworkConfiguration>;
    /**
     * Destroys and unregisters the network identified by the given chain ID, also
     * removing the associated network configuration from state.
     *
     * @param chainId - The chain ID associated with an existing network.
     * @throws if `chainId` does not refer to an existing network configuration,
     * or if the currently selected network is being removed.
     * @see {@link NetworkConfiguration}
     */
    removeNetwork(chainId: Hex): void;
    /**
     * Assuming that the network has been previously switched, switches to this
     * new network.
     *
     * If the network has not been previously switched, this method is equivalent
     * to {@link resetConnection}.
     */
    rollbackToPreviousProvider(): Promise<void>;
    /**
     * Deactivates the controller, stopping any ongoing polling.
     *
     * In-progress requests will not be aborted.
     */
    destroy(): Promise<void>;
    /**
     * Merges the given backup data into controller state.
     *
     * @param backup - The data that has been backed up.
     * @param backup.networkConfigurationsByChainId - Network configurations,
     * keyed by chain ID.
     */
    loadBackup({ networkConfigurationsByChainId, }: Pick<NetworkState, 'networkConfigurationsByChainId'>): void;
    /**
     * Searches for the default RPC endpoint configured for the given chain and
     * returns its network client ID. This can then be passed to
     * {@link getNetworkClientById} to retrieve the network client.
     *
     * @param chainId - Chain ID to search for.
     * @returns The ID of the network client created for the chain's default RPC
     * endpoint.
     */
    findNetworkClientIdByChainId(chainId: Hex): NetworkClientId;
}
export {};
//# sourceMappingURL=NetworkController.d.mts.map