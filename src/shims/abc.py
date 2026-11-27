def abstractmethod(f):
    f.__isabstractmethod__ = True
    return f

class ABC:
    def __new__(cls, *args, **kwargs):
        missing = []
        for k in dir(cls):
            v = getattr(cls, k, None)
            if getattr(v, '__isabstractmethod__', False):
                missing.append(k)
        if missing:
            raise TypeError("Can't instantiate abstract class " + cls.__name__ + " with abstract method " + ', '.join(sorted(missing)))
        return object.__new__(cls)
