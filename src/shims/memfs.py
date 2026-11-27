_files = {}

class TextFile:
    def __init__(self, name, mode):
        self.name = name
        self.mode = mode
        self.closed = False
        self._pos = 0
        if 'w' in mode:
            _files[name] = ''
        elif 'a' in mode:
            _files[name] = _files.get(name, '')
        elif name not in _files:
            raise IOError("No such file or directory: '" + name + "'")
    def _check(self):
        if self.closed:
            raise ValueError('I/O operation on closed file.')
    def write(self, s):
        self._check()
        _files[self.name] = _files[self.name] + s
        return len(s)
    def read(self):
        self._check()
        data = _files[self.name][self._pos:]
        self._pos = len(_files[self.name])
        return data
    def readlines(self):
        return self.read().splitlines(True)
    def __iter__(self):
        return iter(self.readlines())
    def close(self):
        self.closed = True
    def __enter__(self):
        return self
    def __exit__(self, t, v, tb):
        self.close()
        return False

def open(name, mode='r'):
    return TextFile(name, mode)
