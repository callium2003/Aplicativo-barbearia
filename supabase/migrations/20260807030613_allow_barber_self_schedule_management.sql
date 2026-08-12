-- Permite ao barbeiro administrar somente a própria disponibilidade.
-- Estrutura de profissionais (nome, status, comissão etc.) permanece fora deste escopo.

DROP POLICY IF EXISTS "Authenticated can read allowed professional hours" ON public.professional_hours;
CREATE POLICY "Authenticated can read allowed professional hours"
ON public.professional_hours
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.professionals p
    JOIN public.barbershops b ON b.id = p.barbershop_id
    WHERE p.id = professional_hours.professional_id
      AND p.active
      AND b.active
  )
  OR private.current_barbershop_role((
    SELECT p.barbershop_id FROM public.professionals p
    WHERE p.id = professional_hours.professional_id
  )) IN ('owner', 'manager')
  OR professional_hours.professional_id = private.current_barber_professional_id((
    SELECT p.barbershop_id FROM public.professionals p
    WHERE p.id = professional_hours.professional_id
  ))
);

DROP POLICY IF EXISTS "Owner or manager can insert professional hours" ON public.professional_hours;
CREATE POLICY "Owner manager or self can insert professional hours"
ON public.professional_hours
FOR INSERT
TO authenticated
WITH CHECK (
  private.current_barbershop_role((
    SELECT p.barbershop_id FROM public.professionals p
    WHERE p.id = professional_hours.professional_id
  )) IN ('owner', 'manager')
  OR professional_hours.professional_id = private.current_barber_professional_id((
    SELECT p.barbershop_id FROM public.professionals p
    WHERE p.id = professional_hours.professional_id
  ))
);

DROP POLICY IF EXISTS "Owner or manager can update professional hours" ON public.professional_hours;
CREATE POLICY "Owner manager or self can update professional hours"
ON public.professional_hours
FOR UPDATE
TO authenticated
USING (
  private.current_barbershop_role((
    SELECT p.barbershop_id FROM public.professionals p
    WHERE p.id = professional_hours.professional_id
  )) IN ('owner', 'manager')
  OR professional_hours.professional_id = private.current_barber_professional_id((
    SELECT p.barbershop_id FROM public.professionals p
    WHERE p.id = professional_hours.professional_id
  ))
)
WITH CHECK (
  private.current_barbershop_role((
    SELECT p.barbershop_id FROM public.professionals p
    WHERE p.id = professional_hours.professional_id
  )) IN ('owner', 'manager')
  OR professional_hours.professional_id = private.current_barber_professional_id((
    SELECT p.barbershop_id FROM public.professionals p
    WHERE p.id = professional_hours.professional_id
  ))
);

DROP POLICY IF EXISTS "Owner or manager can delete professional hours" ON public.professional_hours;
CREATE POLICY "Owner manager or self can delete professional hours"
ON public.professional_hours
FOR DELETE
TO authenticated
USING (
  private.current_barbershop_role((
    SELECT p.barbershop_id FROM public.professionals p
    WHERE p.id = professional_hours.professional_id
  )) IN ('owner', 'manager')
  OR professional_hours.professional_id = private.current_barber_professional_id((
    SELECT p.barbershop_id FROM public.professionals p
    WHERE p.id = professional_hours.professional_id
  ))
);

DROP POLICY IF EXISTS "Owner or manager can manage professional breaks" ON public.professional_breaks;
CREATE POLICY "Owner manager or self can manage professional breaks"
ON public.professional_breaks
FOR ALL
TO authenticated
USING (
  private.current_barbershop_role((
    SELECT p.barbershop_id FROM public.professionals p
    WHERE p.id = professional_breaks.professional_id
  )) IN ('owner', 'manager')
  OR professional_breaks.professional_id = private.current_barber_professional_id((
    SELECT p.barbershop_id FROM public.professionals p
    WHERE p.id = professional_breaks.professional_id
  ))
)
WITH CHECK (
  private.current_barbershop_role((
    SELECT p.barbershop_id FROM public.professionals p
    WHERE p.id = professional_breaks.professional_id
  )) IN ('owner', 'manager')
  OR professional_breaks.professional_id = private.current_barber_professional_id((
    SELECT p.barbershop_id FROM public.professionals p
    WHERE p.id = professional_breaks.professional_id
  ))
);

DROP POLICY IF EXISTS "Owner or manager can manage professional blocks" ON public.professional_time_blocks;
CREATE POLICY "Owner manager or self can manage professional blocks"
ON public.professional_time_blocks
FOR ALL
TO authenticated
USING (
  private.current_barbershop_role((
    SELECT p.barbershop_id FROM public.professionals p
    WHERE p.id = professional_time_blocks.professional_id
  )) IN ('owner', 'manager')
  OR professional_time_blocks.professional_id = private.current_barber_professional_id((
    SELECT p.barbershop_id FROM public.professionals p
    WHERE p.id = professional_time_blocks.professional_id
  ))
)
WITH CHECK (
  private.current_barbershop_role((
    SELECT p.barbershop_id FROM public.professionals p
    WHERE p.id = professional_time_blocks.professional_id
  )) IN ('owner', 'manager')
  OR professional_time_blocks.professional_id = private.current_barber_professional_id((
    SELECT p.barbershop_id FROM public.professionals p
    WHERE p.id = professional_time_blocks.professional_id
  ))
);
