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
        task2 = Task(include("FileReader.jl"))

    task1 = Task(include("ToUpercase.jl"))
    println("end")

    #@async include("ToUpercase.jl")
    #run(ToUpercase)

    #run(FileReader)

end