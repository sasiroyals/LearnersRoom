def _fields_of(cls):
    found = []
    for k in list(cls.__dict__.keys()):
        if k.startswith('_dc_'):
            found.append(k)
    found.sort()
    out = []
    for k in found:
        name = k[8:]
        out.append((name, cls.__dict__[k]))
        delattr(cls, k)
    return out

def dataclass(cls=None, frozen=False):
    def wrap(cls):
        fields = _fields_of(cls)
        names = [n for n, d in fields]
        defaults = {}
        for n, d in fields:
            if d != '__DC_MISSING__':
                defaults[n] = d
        def __init__(self, *args, **kwargs):
            if len(args) > len(names):
                raise TypeError('__init__() takes ' + str(len(names)) + ' positional arguments but ' + str(len(args)) + ' were given')
            for i in range(len(names)):
                n = names[i]
                if i < len(args):
                    v = args[i]
                elif n in kwargs:
                    v = kwargs[n]
                elif n in defaults:
                    v = defaults[n]
                else:
                    raise TypeError("__init__() missing required argument: '" + n + "'")
                object.__setattr__(self, n, v)
        def __repr__(self):
            return cls.__name__ + '(' + ', '.join([n + '=' + repr(getattr(self, n)) for n in names]) + ')'
        def __eq__(self, other):
            if other.__class__ is not self.__class__:
                return NotImplemented
            return [getattr(self, n) for n in names] == [getattr(other, n) for n in names]
        cls.__init__ = __init__
        cls.__repr__ = __repr__
        cls.__eq__ = __eq__
        if frozen:
            def __setattr__(self, n, v):
                raise AttributeError("cannot assign to field '" + n + "'")
            cls.__setattr__ = __setattr__
        return cls
    if cls is None:
        return wrap
    return wrap(cls)
