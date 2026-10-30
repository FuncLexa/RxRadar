import inspect
import tinyfish as t

c = t.AsyncTinyFish(api_key="x")


def show(name, obj):
    try:
        fields = getattr(obj, "model_fields", None)
        print(name, "->", list(fields.keys()) if fields else inspect.signature(obj))
    except Exception as e:
        print(name, "-> ERR", e)


show("agent.stream", c.agent.stream)
show("fetch.get_contents", c.fetch.get_contents)
show("monitors.create", c.monitors.create)
for n in ["AgentConfig", "ProxyConfig", "CompleteEvent", "ProgressEvent", "StreamingUrlEvent"]:
    show(n, getattr(t, n, None))
if hasattr(t, "ProxyCountryCode"):
    print("ProxyCountryCode ->", [x.value for x in t.ProxyCountryCode])
