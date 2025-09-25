import type { RpcServiceRequestable } from "./rpc-service-requestable.mjs";
/**
 * The interface for a service class responsible for making a request to an RPC
 * endpoint or a group of RPC endpoints.
 */
export type AbstractRpcService = RpcServiceRequestable & {
    /**
     * The URL of the RPC endpoint.
     */
    endpointUrl: URL;
};
//# sourceMappingURL=abstract-rpc-service.d.mts.map