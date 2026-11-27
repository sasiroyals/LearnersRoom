"""heapq for the in-browser runner (Skulpt ships it unimplemented).
A min-heap kept in a plain list: heap[0] is always the smallest item."""


def _up(heap, i):
    item = heap[i]
    while i > 0:
        parent = (i - 1) // 2
        if item < heap[parent]:
            heap[i] = heap[parent]
            i = parent
        else:
            break
    heap[i] = item


def _down(heap, i):
    n = len(heap)
    item = heap[i]
    while True:
        child = 2 * i + 1
        if child >= n:
            break
        if child + 1 < n and heap[child + 1] < heap[child]:
            child += 1
        if heap[child] < item:
            heap[i] = heap[child]
            i = child
        else:
            break
    heap[i] = item


def heappush(heap, item):
    heap.append(item)
    _up(heap, len(heap) - 1)


def heappop(heap):
    last = heap.pop()
    if not heap:
        return last
    top = heap[0]
    heap[0] = last
    _down(heap, 0)
    return top


def heapify(x):
    for i in range(len(x) // 2 - 1, -1, -1):
        _down(x, i)


def heapreplace(heap, item):
    top = heap[0]
    heap[0] = item
    _down(heap, 0)
    return top


def heappushpop(heap, item):
    if heap and heap[0] < item:
        item, heap[0] = heap[0], item
        _down(heap, 0)
    return item


def nsmallest(n, iterable, key=None):
    return sorted(iterable, key=key)[:n]


def nlargest(n, iterable, key=None):
    return sorted(iterable, key=key, reverse=True)[:n]
