# Apoyo a decisiones

La vista Decisiones utiliza el último corte oficial compatible con los filtros de año, localidad, biológico y sector. El análisis principal usa primera infancia y excluye las cargas manuales. La referencia distrital de alertas utiliza la fuente mensual y se oculta si se elige un desglose territorial o sectorial incompatible.

La cobertura divide las dosis por el denominador observado. La brecha es la diferencia positiva frente a la meta del 95 %. Las dosis faltantes son las dosis enteras necesarias para alcanzar esa meta con el denominador fijo. La prioridad combina la brecha dividida por la meta y las dosis faltantes divididas por el máximo de la selección, con los pesos indicados en el tablero. Se desempata por nombre de localidad.

Cada escenario conserva el denominador y suma las dosis introducidas al mismo indicador. Los casos A y B son simulaciones aritméticas. Las alertas de descenso comparan dos años cerrados y consecutivos del mismo biológico. Los periodos parciales y los registros observados se muestran con su propia regla.

El CSV conserva el corte, ambos recursos de origen, los filtros, el peso, la metodología y los resultados. La interfaz usa las fuentes y los cortes disponibles en VacunaBI. La simulación no estima la evolución futura ni el efecto causal de una intervención.
