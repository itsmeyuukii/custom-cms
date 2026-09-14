type Card = {
  title: string;
  description?: string;
  imageUrl?: string;
};

type CardGridProps = {
  cards?: Card[];
};

export function CardGrid({ cards = [] }: CardGridProps) {
  return (
    <section className="grid grid-cols-1 gap-6 px-6 py-16 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-gray-200"
        >
          {card.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.imageUrl}
              alt={card.title}
              className="h-40 w-full object-cover"
            />
          )}
          <div className="p-4">
            <h3 className="font-semibold">{card.title}</h3>
            {card.description && (
              <p className="mt-1 text-sm text-gray-600">{card.description}</p>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
