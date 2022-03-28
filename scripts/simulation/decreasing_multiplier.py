import sys
import os
from decimal import *

lock_duration = Decimal(63115200) # 2yr
#lock_duration = Decimal(31557600) # 1yr
#lock_duration = Decimal(15778800) # 6m
#lock_duration = Decimal(7889400) # 3m

time_ellapsed = Decimal(15778800) # 6m
#time_ellapsed = Decimal(7889400) # 3m
#time_ellapsed = Decimal(2629800) # 1m

drop_per_sec = Decimal('0.05')

base_mult = Decimal(1)

def multiplierAt(t):
    if(t < 7889400):
        return 1
    ratio = Decimal(t - 7889400) / Decimal(63115200 - 7889400)
    mult = Decimal(2 + (4 * ratio))
    return mult

start_mult = multiplierAt(lock_duration)

print("Start mult ", start_mult)

decrease_per_sec = Decimal(start_mult - base_mult) / Decimal(lock_duration)

print("Decrease ", decrease_per_sec)

end_mult = start_mult - Decimal(decrease_per_sec * time_ellapsed)

print("End mult ", end_mult)

current_mult = start_mult

total_accrued = Decimal(0)

for i in range(int(time_ellapsed)):
    drop = drop_per_sec * current_mult
    total_accrued += drop

    current_mult = current_mult - decrease_per_sec

print("Mult after decrease ", current_mult)

print("Total Accrued ", total_accrued)
print("Got correct end mult ? ", current_mult == end_mult)

"""
estimated_mult = end_mult + ((Decimal(decrease_per_sec * time_ellapsed) + decrease_per_sec) / Decimal(2))

print("Estimated mult ", estimated_mult)

estimated_accrued = Decimal(estimated_mult) * drop_per_sec * time_ellapsed

print("Estimated Accrued ", estimated_accrued)

print("Got the same ? ", estimated_accrued == total_accrued)
print("Diff ", estimated_accrued - total_accrued)
"""

half_mult = start_mult - Decimal(decrease_per_sec * (time_ellapsed / Decimal(2)))
end_mult = start_mult - Decimal(decrease_per_sec * time_ellapsed)

estimated_mult1 = half_mult + ((Decimal(decrease_per_sec * (time_ellapsed / Decimal(2))) + decrease_per_sec) / Decimal(2))


estimated_mult2 = end_mult + ((Decimal(decrease_per_sec * (time_ellapsed / Decimal(2))) + decrease_per_sec) / Decimal(2))


print("half mult", half_mult)
print("Estimated mult 1", estimated_mult1)
print("Estimated mult 2", estimated_mult2)

estimated_accrued1 = Decimal(estimated_mult1) * drop_per_sec * (time_ellapsed / Decimal(2))

estimated_accrued2 = Decimal(estimated_mult2) * drop_per_sec * (time_ellapsed / Decimal(2))

print("Estimated Accrued 1 ", estimated_accrued1)
print("Estimated Accrued 2 ", estimated_accrued2)
print("Estimated Accrued total", estimated_accrued1 + estimated_accrued2)
print("Diff ", (estimated_accrued1 + estimated_accrued2) - total_accrued)

