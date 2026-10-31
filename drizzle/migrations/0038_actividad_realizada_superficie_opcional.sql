-- CU30: la superficie trabajada es opcional y la labor admite observaciones.
ALTER TABLE "actividades_realizadas" ALTER COLUMN "superficie_trabajada" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "actividades_realizadas" ADD COLUMN "observaciones" text;
