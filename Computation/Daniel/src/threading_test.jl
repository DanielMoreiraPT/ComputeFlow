Threads.nthreads()
Threads.threadid()

using BenchmarkTools

# Single Threading

function fib(n::BigInt)
    if n < 2
        return n
    end

    return fib(n - 1) + fib(n - 2)
end

fib(n::Int) = fib(BigInt(n))

# Multi Threading

function fib_mt(n::BigInt)
    if n < 2
        return n
    end
    t = Threads.@spawn fib(n - 2)
    return fib(n - 1) + fetch(t)
end

fib_mt(n::Int) = fib_mt(BigInt(n))


println(@benchmark fib(15))

println(@benchmark fib_mt(15))
