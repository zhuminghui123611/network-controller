import type { PollingBlockTrackerOptions } from "@metamask/eth-block-tracker";
import type { NetworkControllerMessenger } from "./NetworkController.cjs";
import type { RpcServiceOptions } from "./rpc-service/rpc-service.cjs";
import type { BlockTracker, NetworkClientConfiguration, Provider } from "./types.cjs";
/**
 * The pair of provider / block tracker that can be used to interface with the
 * network and respond to new activity.
 */
export type NetworkClient = {
    configuration: NetworkClientConfiguration;
    provider: Provider;
    blockTracker: BlockTracker;
    destroy: () => void;
};
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
export declare function createNetworkClient({ configuration, getRpcServiceOptions, getBlockTrackerOptions, messenger, isRpcFailoverEnabled, }: {
    configuration: NetworkClientConfiguration;
    getRpcServiceOptions: (rpcEndpointUrl: string) => Omit<RpcServiceOptions, 'failoverService' | 'endpointUrl'>;
    getBlockTrackerOptions: (rpcEndpointUrl: string) => Omit<PollingBlockTrackerOptions, 'provider'>;
    messenger: NetworkControllerMessenger;
    isRpcFailoverEnabled: boolean;
}): NetworkClient;
//# sourceMappingURL=create-network-client.d.cts.map