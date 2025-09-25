"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNetworkClient = void 0;
const controller_utils_1 = require("@metamask/controller-utils");
const eth_block_tracker_1 = require("@metamask/eth-block-tracker");
const eth_json_rpc_infura_1 = require("@metamask/eth-json-rpc-infura");
const eth_json_rpc_middleware_1 = require("@metamask/eth-json-rpc-middleware");
const eth_json_rpc_provider_1 = require("@metamask/eth-json-rpc-provider");
const json_rpc_engine_1 = require("@metamask/json-rpc-engine");
const rpc_service_chain_1 = require("./rpc-service/rpc-service-chain.cjs");
const types_1 = require("./types.cjs");
const SECOND = 1000;
/**
 * Create a JSON RPC network client for a specific network.
 *
 * @param args - The arguments.
 * @param args.configuration - The network configuration.
 * @param args.getRpcServiceOptions - Factory for constructing RPC service
 * options. See {@link NetworkControllerOptions.getRpcServiceOptions}.
 * @param args.getBlockTrackerOptions - Factory for constructing block tracker
 * options. See {@link NetworkControllerOptions.getBlockTrackerOptions}.
 * @param args.messenger - The network controller messenger.
 * @param args.isRpcFailoverEnabled - Whether or not requests sent to the
 * primary RPC endpoint for this network should be automatically diverted to
 * provided failover endpoints if the primary is unavailable. This effectively
 * causes the `failoverRpcUrls` property of the network client configuration
 * to be honored or ignored.
 * @returns The network client.
 */
function createNetworkClient({ configuration, getRpcServiceOptions, getBlockTrackerOptions, messenger, isRpcFailoverEnabled, }) {
    const primaryEndpointUrl = configuration.type === types_1.NetworkClientType.Infura
        ? `https://${configuration.network}.infura.io/v3/${configuration.infuraProjectId}`
        : configuration.rpcUrl;
    const availableEndpointUrls = isRpcFailoverEnabled
        ? [primaryEndpointUrl, ...(configuration.failoverRpcUrls ?? [])]
        : [primaryEndpointUrl];
    const rpcServiceChain = new rpc_service_chain_1.RpcServiceChain(availableEndpointUrls.map((endpointUrl) => ({
        ...getRpcServiceOptions(endpointUrl),
        endpointUrl,
    })));
    rpcServiceChain.onBreak(({ endpointUrl, failoverEndpointUrl, ...rest }) => {
        let error;
        if ('error' in rest) {
            error = rest.error;
        }
        else if ('value' in rest) {
            error = rest.value;
        }
        messenger.publish('NetworkController:rpcEndpointUnavailable', {
            chainId: configuration.chainId,
            endpointUrl,
            failoverEndpointUrl,
            error,
        });
    });
    rpcServiceChain.onDegraded(({ endpointUrl, ...rest }) => {
        let error;
        if ('error' in rest) {
            error = rest.error;
        }
        else if ('value' in rest) {
            error = rest.value;
        }
        messenger.publish('NetworkController:rpcEndpointDegraded', {
            chainId: configuration.chainId,
            endpointUrl,
            error,
        });
    });
    rpcServiceChain.onRetry(({ endpointUrl, attempt }) => {
        messenger.publish('NetworkController:rpcEndpointRequestRetried', {
            endpointUrl,
            attempt,
        });
    });
    const rpcApiMiddleware = configuration.type === types_1.NetworkClientType.Infura
        ? (0, eth_json_rpc_infura_1.createInfuraMiddleware)({
            rpcService: rpcServiceChain,
            options: {
                source: 'metamask',
            },
        })
        : (0, eth_json_rpc_middleware_1.createFetchMiddleware)({ rpcService: rpcServiceChain });
    const rpcProvider = (0, eth_json_rpc_provider_1.providerFromMiddleware)(rpcApiMiddleware);
    const blockTracker = createBlockTracker({
        networkClientType: configuration.type,
        endpointUrl: primaryEndpointUrl,
        getOptions: getBlockTrackerOptions,
        provider: rpcProvider,
    });
    const networkMiddleware = configuration.type === types_1.NetworkClientType.Infura
        ? createInfuraNetworkMiddleware({
            blockTracker,
            network: configuration.network,
            rpcProvider,
            rpcApiMiddleware,
        })
        : createCustomNetworkMiddleware({
            blockTracker,
            chainId: configuration.chainId,
            rpcApiMiddleware,
        });
    const engine = new json_rpc_engine_1.JsonRpcEngine();
    engine.push(networkMiddleware);
    const provider = (0, eth_json_rpc_provider_1.providerFromEngine)(engine);
    const destroy = () => {
        // TODO: Either fix this lint violation or explain why it's necessary to ignore.
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        blockTracker.destroy();
    };
    return { configuration, provider, blockTracker, destroy };
}
exports.createNetworkClient = createNetworkClient;
/**
 * Create the block tracker for the network.
 *
 * @param args - The arguments.
 * @param args.networkClientType - The type of the network client ("infura" or
 * "custom").
 * @param args.endpointUrl - The URL of the endpoint.
 * @param args.getOptions - Factory for the block tracker options.
 * @param args.provider - The EIP-1193 provider for the network's JSON-RPC
 * middleware stack.
 * @returns The created block tracker.
 */
function createBlockTracker({ networkClientType, endpointUrl, getOptions, provider, }) {
    const testOptions = process.env.IN_TEST && networkClientType === types_1.NetworkClientType.Custom
        ? { pollingInterval: SECOND }
        : {};
    return new eth_block_tracker_1.PollingBlockTracker({
        ...testOptions,
        ...getOptions(endpointUrl),
        provider,
    });
}
/**
 * Create middleware for infura.
 *
 * @param args - The arguments.
 * @param args.blockTracker - The block tracker to use.
 * @param args.network - The Infura network to use.
 * @param args.rpcProvider - The RPC provider to use.
 * @param args.rpcApiMiddleware - Additional middleware.
 * @returns The collection of middleware that makes up the Infura client.
 */
function createInfuraNetworkMiddleware({ blockTracker, network, rpcProvider, rpcApiMiddleware, }) {
    return (0, json_rpc_engine_1.mergeMiddleware)([
        createNetworkAndChainIdMiddleware({ network }),
        (0, eth_json_rpc_middleware_1.createBlockCacheMiddleware)({ blockTracker }),
        (0, eth_json_rpc_middleware_1.createInflightCacheMiddleware)(),
        (0, eth_json_rpc_middleware_1.createBlockRefMiddleware)({ blockTracker, provider: rpcProvider }),
        (0, eth_json_rpc_middleware_1.createRetryOnEmptyMiddleware)({ blockTracker, provider: rpcProvider }),
        (0, eth_json_rpc_middleware_1.createBlockTrackerInspectorMiddleware)({ blockTracker }),
        rpcApiMiddleware,
    ]);
}
/**
 * Creates static method middleware.
 *
 * @param args - The Arguments.
 * @param args.network - The Infura network to use.
 * @returns The middleware that implements the eth_chainId method.
 */
function createNetworkAndChainIdMiddleware({ network, }) {
    return (0, json_rpc_engine_1.createScaffoldMiddleware)({
        // TODO: Either fix this lint violation or explain why it's necessary to ignore.
        // eslint-disable-next-line @typescript-eslint/naming-convention
        eth_chainId: controller_utils_1.ChainId[network],
    });
}
const createChainIdMiddleware = (chainId) => {
    return (req, res, next, end) => {
        if (req.method === 'eth_chainId') {
            res.result = chainId;
            return end();
        }
        return next();
    };
};
/**
 * Creates custom middleware.
 *
 * @param args - The arguments.
 * @param args.blockTracker - The block tracker to use.
 * @param args.chainId - The chain id to use.
 * @param args.rpcApiMiddleware - Additional middleware.
 * @returns The collection of middleware that makes up the Infura client.
 */
function createCustomNetworkMiddleware({ blockTracker, chainId, rpcApiMiddleware, }) {
    const testMiddlewares = process.env.IN_TEST
        ? [createEstimateGasDelayTestMiddleware()]
        : [];
    return (0, json_rpc_engine_1.mergeMiddleware)([
        ...testMiddlewares,
        createChainIdMiddleware(chainId),
        (0, eth_json_rpc_middleware_1.createBlockRefRewriteMiddleware)({ blockTracker }),
        (0, eth_json_rpc_middleware_1.createBlockCacheMiddleware)({ blockTracker }),
        (0, eth_json_rpc_middleware_1.createInflightCacheMiddleware)(),
        (0, eth_json_rpc_middleware_1.createBlockTrackerInspectorMiddleware)({ blockTracker }),
        rpcApiMiddleware,
    ]);
}
/**
 * For use in tests only.
 * Adds a delay to `eth_estimateGas` calls.
 *
 * @returns The middleware for delaying gas estimation calls by 2 seconds when in test.
 */
function createEstimateGasDelayTestMiddleware() {
    return (0, json_rpc_engine_1.createAsyncMiddleware)(async (req, _, next) => {
        if (req.method === 'eth_estimateGas') {
            await new Promise((resolve) => setTimeout(resolve, SECOND * 2));
        }
        return next();
    });
}
//# sourceMappingURL=create-network-client.cjs.map