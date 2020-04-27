"""
# module Run

- Julia version:
- Author: anunia
- Date: 2020-04-26

# Examples

```jldoctest
julia>
```
"""
module Run
    #import Base.Threads.@everywhere
    #import Distributed.@everywhere
    #@async include("FileReader.jl")
    using JSON

    println("Im running")
    # show(summary(ToUpercase.ToUpercase_f))

    include("FileReader.jl")
    println("Im running2")

    include("ToUpercase.jl")
    # show(summary(ToUpercase_f))
    global ToUpercase_channel = Channel(1)

    #task2 = Task(include("FileReader.jl"))
    task2 = Task(FileReader.FileReader_f(ToUpercase_channel))

    task1 = Task(ToUpercase.ToUpercase_f(ToUpercase_channel))

    schedule(task1)

    # println("==> summary: ",summary(task2))
    schedule(task2)
    # println("333fetch----->",fetch(ToUpercase_channel))


    #task1 = Task(Func_ToUpercase)

    # yield()
    # yield(task1)
    # println(current_task())
    # yield(task2)
    # println(current_task())
    # yield()
    # println(current_task())
    # println(istaskdone(task2))

    # println(fetch(ToUpercase.ToUpercase_channel))

    # yield()
    println("end")

    #@async include("ToUpercase.jl")
    #run(ToUpercase)

    #run(FileReader)

end
