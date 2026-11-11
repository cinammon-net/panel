import { router } from '@inertiajs/react';
import { CalendarHeart, Coins, Gift, PartyPopper, Percent, TimerReset } from 'lucide-react';
import { useState } from 'react';

import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export type BirthdayInfo = {
    day: number | null;
    month: number | null;
    public: boolean;
    label: string | null;
    days_until: number | null;
    gift: { eligible: boolean; reason: string | null };
    preview: { coins: number; discount: number; discount_days: number; extra_days: number; vip: boolean };
    min_days: number;
};

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const select =
    'h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-neutral-900';

export default function BirthdaySettings({ birthday }: { birthday: BirthdayInfo }) {
    const [day, setDay] = useState<number | ''>(birthday.day ?? '');
    const [month, setMonth] = useState<number | ''>(birthday.month ?? '');
    const [pub, setPub] = useState(birthday.public);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const changed = day !== (birthday.day ?? '') || month !== (birthday.month ?? '') || pub !== birthday.public;
    const maxDay = month ? DAYS_IN[Number(month) - 1] : 31;
    const p = birthday.preview;

    const save = (clear = false) => {
        setSaving(true);
        setError(null);
        router.put(
            route('profile.birthday'),
            clear ? { day: null, month: null, public: pub } : { day: day || null, month: month || null, public: pub },
            {
                preserveScroll: true,
                onError: (e) => setError(e.birthday ?? e.day ?? e.month ?? 'No se pudo guardar.'),
                onFinish: () => setSaving(false),
                onSuccess: () => clear && (setDay(''), setMonth('')),
            },
        );
    };

    return (
        <div className="space-y-5">
            <HeadingSmall title="Tu cumpleaños" description="Ese día te felicitamos en el panel, en Discord y por correo, y te llega un set de regalos." />

            {birthday.label && birthday.days_until !== null && (
                <div className="flex items-center gap-3 rounded-lg border border-pink-400/40 bg-pink-500/10 px-4 py-3 text-sm">
                    <PartyPopper className="h-5 w-5 shrink-0 text-pink-500" />
                    <span>
                        {birthday.days_until === 0 ? (
                            <b>¡Hoy es tu cumpleaños! Felicidades.</b>
                        ) : (
                            <>
                                Tu cumpleaños es el <b>{birthday.label}</b>: faltan <b>{birthday.days_until}</b> {birthday.days_until === 1 ? 'día' : 'días'}.
                            </>
                        )}
                    </span>
                </div>
            )}

            <div className="flex flex-wrap items-end gap-3">
                <div className="grid gap-1.5">
                    <Label htmlFor="bday-day">Día</Label>
                    <select id="bday-day" className={select} value={day} onChange={(e) => setDay(e.target.value ? Number(e.target.value) : '')}>
                        <option value="">--</option>
                        {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                            <option key={d} value={d}>
                                {d}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="bday-month">Mes</Label>
                    <select
                        id="bday-month"
                        className={select}
                        value={month}
                        onChange={(e) => {
                            const m = e.target.value ? Number(e.target.value) : '';
                            setMonth(m);
                            if (m && day && Number(day) > DAYS_IN[m - 1]) setDay(DAYS_IN[m - 1]);
                        }}
                    >
                        <option value="">--</option>
                        {MONTHS.map((m, i) => (
                            <option key={m} value={i + 1}>
                                {m}
                            </option>
                        ))}
                    </select>
                </div>
                <Button type="button" disabled={saving || !changed || !day || !month} onClick={() => save()}>
                    Guardar
                </Button>
                {birthday.label && (
                    <Button type="button" variant="ghost" disabled={saving} onClick={() => save(true)}>
                        Quitar
                    </Button>
                )}
            </div>
            <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} className="h-4 w-4 accent-pink-500" />
                Que la comunidad de Discord me felicite (sale en el canal general y en <code>/cumpleaños proximos</code>)
            </label>
            <InputError message={error ?? undefined} />

            <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Gift className="h-4 w-4 text-pink-500" /> Tu set de regalo{p.vip ? ' (versión VIP)' : ''}
                </p>
                <ul className="grid gap-2 text-sm sm:grid-cols-2">
                    <li className="flex items-start gap-2">
                        <Coins className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" /> <span><b>{p.coins} monedas</b> para la tienda</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <Percent className="mt-0.5 h-4 w-4 shrink-0 text-pink-500" />
                        <span><b>-{p.discount}%</b> en un pedido durante {p.discount_days} días</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <TimerReset className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span><b>+{p.extra_days} días gratis</b> en tus servicios de pago activos</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <CalendarHeart className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                        <span>Rol <b>Cumpleañero</b> en Discord y una tarjeta con las felicitaciones de la comunidad</span>
                    </li>
                </ul>
                <p className="mt-3 text-xs text-neutral-500">
                    {birthday.label && !birthday.gift.eligible && birthday.gift.reason
                        ? birthday.gift.reason
                        : `Para que llegue el regalo, la fecha tiene que estar guardada al menos ${birthday.min_days} días antes (cambiarla reinicia ese plazo). Los regalos de la tienda van a la cuenta de billing.cinammon.net con tu mismo correo.`}
                </p>
            </div>
        </div>
    );
}
