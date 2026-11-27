def wraps(wrapped):
    def deco(f):
        f.__name__ = wrapped.__name__
        f.__doc__ = wrapped.__doc__
        f.__wrapped__ = wrapped
        return f
    return deco

def reduce(fn, items, *start):
    it = iter(items)
    acc = start[0] if start else next(it)
    for x in it:
        acc = fn(acc, x)
    return acc
