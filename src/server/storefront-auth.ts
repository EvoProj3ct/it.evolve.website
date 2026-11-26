import "server-only";
import mongoose from "mongoose";
import { createStorefrontAuth } from "@evolve/ecommerce-server/auth";

// La factory non apre connessioni: env, DB e indici vengono verificati alla richiesta.
export const storefrontAuth = createStorefrontAuth({ mongoose, env: process.env });
