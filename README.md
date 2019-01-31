# Solid-TPF

This is a quick research prototype of how to build a query interface
([Triple Pattern Fragments](https://www.hydra-cg.com/spec/latest/triple-pattern-fragments/))
on top of a [Solid](https://solid.mit.edu/) server.

This query interface will respect WebID authentication,
and only return triples that the logged in user is allowed to see.

## Quick start guide
Disclaimer: this is a prototype, no guarantee it will (still) work.

- This prototype takes a file system for Solid as input, and assumes full read access to it.
- First, an index of all data needs to be created, by running `bin/solid-to-tpf`. This index contains all triples, per solid pod and per permissioned user.
- The `feature/datasource` branch contains a data source for the [Linked Data Fragments server](https://github.com/LinkedDataFragments/Server.js).
- Configure a Linked Data Fragments server (version 3) to use this data source.
- Configure a node-solid-server to act as an auth proxy to the Linked Data Fragments server.
- The Linked Data Fragments server will then receive the logged in user, and will return the corresponding triples through a Triple Pattern Fragments interface.
- Use a Linked Data Fragments query client to issue SPARQL queries over one or multiple data sources.
