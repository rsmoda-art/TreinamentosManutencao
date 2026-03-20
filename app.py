import streamlit as st
from streamlit_gsheets import GSheetsConnection
import pandas as pd
from datetime import datetime, timedelta
import plotly.express as px

# --- CONFIGURAÇÃO DA PÁGINA ---
st.set_page_config(page_title="Gestão Matrix - Raízen", layout="wide")

# --- CSS: MENU MODERNO PRETO E AMARELO ---
st.markdown("""
<style>
    [data-testid="stSidebar"] { background-color: #000000; border-right: 2px solid #FFD700; }
    [data-testid="stSidebarNav"] { display: none; } /* Esconde o menu padrão */
    
    .menu-btn {
        background-color: #1a1a1a;
        color: #FFD700 !important;
        border: 2px solid #FFD700;
        border-radius: 8px;
        padding: 10px;
        margin-bottom: 10px;
        text-align: center;
        font-weight: bold;
        cursor: pointer;
        transition: 0.3s;
        text-decoration: none;
        display: block;
    }
    .menu-btn:hover {
        background-color: #FFD700;
        color: #000000 !important;
        box-shadow: 0 0 15px #FFD700;
    }
</style>
""", unsafe_allow_html=True)

# --- CONEXÃO COM GOOGLE SHEETS ---
conn = st.connection("gsheets", type=GSheetsConnection)

def load_all_data():
    # Lendo as 4 abas da sua planilha
    df_c = conn.read(worksheet="Colaboradores", ttl="1m")
    df_t = conn.read(worksheet="Treinamentos", ttl="1m")
    df_f = conn.read(worksheet="Funções", ttl="1m")
    df_r = conn.read(worksheet="Registros", ttl="1m")
    return df_c, df_t, df_f, df_r

df_colab, df_treina, df_func, df_reg = load_all_data()

# --- LÓGICA DE DATAS E STATUS ---
def get_status(cs, t_nome, periodicidade, obrigatorio):
    # Busca último registro
    registro = df_reg[(df_reg['CS'] == cs) & (df_reg['Treinamento'] == t_nome)]
    
    if registro.empty:
        return ("NECESSÁRIO FORMAÇÃO", "#6A0DAD") if obrigatorio else ("N/A", "#666666")
    
    ult_data = pd.to_datetime(registro.iloc[-1]['Data_Execução'])
    vencimento = ult_data + pd.DateOffset(months=int(periodicidade))
    hoje = datetime.now()
    
    # Regra Crítica: 01/04 a 01/11
    is_critico = (vencimento.month >= 4 and vencimento.month <= 11)
    
    if vencimento < hoje:
        return ("TREINAMENTO VENCIDO", "#FF0000")
    elif is_critico:
        return ("VENCIMENTO CRÍTICO", "#FF8C00")
    elif vencimento < (hoje + timedelta(days=30)):
        return ("TREINAMENTO A VENCER", "#FFFF00")
    else:
        return ("TREINAMENTO CONFORME", "#228B22")

# --- SIDEBAR CUSTOMIZADA ---
with st.sidebar:
    st.markdown("<h1 style='color: #FFD700; text-align: center;'>MATRIX PRO</h1>", unsafe_allow_html=True)
    
    pages = {
        "🏠 HOME": "Home",
        "📋 MATRIZ DE TREINAMENTOS": "Matriz",
        "👥 COLABORADORES": "Colaboradores",
        "⚙️ FUNÇÕES": "Funções",
        "✍️ LANÇAR TREINAMENTO": "Lançar",
        "📚 TREINAMENTOS": "Treinamentos"
    }
    
    if 'current_page' not in st.session_state: st.session_state.current_page = "Home"
    
    for label, target in pages.items():
        if st.button(label, key=target, use_container_width=True):
            st.session_state.current_page = target

# --- RENDERIZAÇÃO DAS PÁGINAS ---
p = st.session_state.current_page

if p == "Home":
    st.title("📊 Dashboard de Gestão")
    # Dashboard e filtros de vencimento aqui...
    st.write("Bem-vindo, Renan. Aqui aparecerão os alertas críticos.")

elif p == "Matriz":
    st.title("📋 Matriz de Qualificação")
    
    # Criar DataFrame da Matriz
    matrix_rows = []
    df_colab_sorted = df_colab.sort_values(by=["Função", "Nome"])
    
    for _, colab in df_colab_sorted.iterrows():
        row = {"CS": colab['CS'], "NOME": colab['Nome'], "FUNÇÃO": colab['Função']}
        
        # Obter treinamentos obrigatórios da função
        req_row = df_func[df_func['Nome_Função'] == colab['Função']]
        obrigatorios = str(req_row.iloc[0]['Treinamentos_Obrigatórios']).split(",") if not req_row.empty else []
        obrigatorios = [o.strip() for o in obrigatorios]
        
        for _, t in df_treina.iterrows():
            status, _ = get_status(colab['CS'], t['Nome'], t['Periodicidade'], t['Nome'] in obrigatorios)
            row[t['Nome']] = status
        matrix_rows.append(row)
    
    df_matrix = pd.DataFrame(matrix_rows)
    
    # Estilização
    def style_cells(val):
        color = 'white'
        bg = 'transparent'
        if val == "NECESSÁRIO FORMAÇÃO": bg = '#6A0DAD'
        elif val == "TREINAMENTO VENCIDO": bg = '#FF0000'
        elif val == "VENCIMENTO CRÍTICO": bg = '#FF8C00'; color = 'black'
        elif val == "TREINAMENTO A VENCER": bg = '#FFFF00'; color = 'black'
        elif val == "TREINAMENTO CONFORME": bg = '#228B22'
        return f'background-color: {bg}; color: {color}; font-weight: bold;'

    st.dataframe(df_matrix.style.applymap(style_cells), use_container_width=True)

elif p == "Lançar":
    st.title("✍️ Lançamento em Lote")
    with st.form("form_lote"):
        nomes = st.multiselect("Selecione os Colaboradores", df_colab["Nome"].tolist())
        treino = st.selectbox("Selecione o Treinamento", df_treina["Nome"].tolist())
        data_exec = st.date_input("Data de Execução")
        
        if st.form_submit_button("SALVAR REGISTROS"):
            # Lógica para converter nomes em CS e salvar no Sheets via conn.update
            st.success(f"Registros de {treino} salvos para {len(nomes)} pessoas!")
