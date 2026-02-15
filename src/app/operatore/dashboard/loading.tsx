export default function Loading() {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 20px',
            gap: '12px',
        }}>
            <span className="spinner" />
            <span style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
                Caricamento dashboard...
            </span>
        </div>
    );
}
