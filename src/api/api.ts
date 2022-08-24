import path from "path";
import FastifyStatic from "@fastify/static";
import FastifySwagger from "@fastify/swagger";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import Fastify, {
  FastifyInstance,
  RawServerBase,
  FastifyLoggerInstance,
  RawServerDefault,
} from "fastify";
import {
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
} from "fastify/types/utils";
import { openapiConfiguration } from ".";
import { CommonConfiguration } from "configuration";
import { FileStoreApi } from "file-store";
import { AttestersLibrary } from "topics/attester";
import { AvailableDataStore } from "topics/available-data";
import availableDataRoutes from "topics/available-data/available-data.api";
import badgesRoutes from "topics/badge/badge.api";
import { GroupStore } from "topics/group";
import { GroupGenerator } from "topics/group-generator";
import groupGeneratorsRoutes from "topics/group-generator/group-generator.api";
import groupsRoutes from "topics/group/group.api";

declare module "fastify" {
  interface FastifyInstance {
    attesters: AttestersLibrary;
    availableDataStore: AvailableDataStore;
    availableGroupStore: FileStoreApi;
    groupGenerators: { [name: string]: GroupGenerator };
    groupStore: GroupStore;
    staticUrl: (path: string) => string;
  }
}

export type Api<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  Logger extends FastifyLoggerInstance = FastifyLoggerInstance
> = FastifyInstance<
  RawServer,
  RawRequest,
  RawReply,
  Logger,
  JsonSchemaToTsProvider
>;

export type ApiConfiguration = Pick<
  CommonConfiguration,
  | "attesters"
  | "availableDataStore"
  | "availableGroupStore"
  | "groupStore"
  | "groupGenerators"
> & {
  log: boolean;
  staticPrefix: string;
};

const removeTrailingSlash = (s: string) => s.replace(/\/+$/, "");

export const createApi = ({
  log,
  attesters,
  availableDataStore,
  availableGroupStore,
  groupGenerators,
  groupStore,
  staticPrefix,
}: ApiConfiguration) => {
  const fastify = Fastify({ logger: log, ignoreTrailingSlash: true });
  fastify
    .withTypeProvider<JsonSchemaToTsProvider>()

    .decorate("attesters", attesters)
    .decorate("availableDataStore", availableDataStore)
    .decorate("availableGroupStore", availableGroupStore)
    .decorate("groupGenerators", groupGenerators)
    .decorate("groupStore", groupStore)
    .decorate(
      "staticUrl",
      (path: string) => `${removeTrailingSlash(staticPrefix)}/${path}`
    )

    .register(FastifyStatic, {
      root: path.join(__dirname, "../../static"),
      prefix: "/static/",
    })
    .register(FastifySwagger, openapiConfiguration)

    .register(availableDataRoutes)
    .register(badgesRoutes)
    .register(groupsRoutes)
    .register(groupGeneratorsRoutes)

    .register(availableGroupStore.registerRoutes())
    .register(groupStore.dataFileStore.registerRoutes());
  return fastify;
};