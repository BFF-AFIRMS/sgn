import { type RouteConfig, index, route } from "@react-router/dev/routes"

export default [
    index("routes/home.tsx"),
    route( "/table", "routes/table/table.tsx",),
    route( "/breeders/manage_programs", "routes/breeders/manage_programs/index.tsx"),
] satisfies RouteConfig
