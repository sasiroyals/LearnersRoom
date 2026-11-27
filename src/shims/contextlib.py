class _GeneratorCM:
    def __init__(self, gen):
        self.gen = gen
    def __enter__(self):
        return next(self.gen)
    def __exit__(self, t, v, tb):
        try:
            next(self.gen)
        except StopIteration:
            pass
        return False

def contextmanager(fn):
    def helper(*args, **kwargs):
        return _GeneratorCM(fn(*args, **kwargs))
    return helper
