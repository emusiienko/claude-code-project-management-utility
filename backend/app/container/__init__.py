from app.container.container import AppContainer

# Single shared container instance — imported by api/ and mcp/ for wiring.
container = AppContainer()

__all__ = ["AppContainer", "container"]
