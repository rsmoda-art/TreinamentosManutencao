import streamlit as st
from streamlit_gsheets import GSheetsConnection
import pandas as pd
from datetime import datetime
import plotly.express as px

# --- CONFIGURAÇÃO DA PÁGINA ---
st.set_page_config(page_title="Gestão de Treinamentos Raízen", layout="wide")

# --- CSS CUSTOMIZADO (BOTÕES PRETO E AMARELO COM BRILHO) ---
st.markdown("""
<style>
    [data-testid="stSidebar"] { background-color: #000000; }
    .stRadio [data-testid="stWidgetLabel"] { color: #FFD700; font-weight: bold; }
    
    /* Estilização dos botões do menu */
    div.stButton > button {
        background-color: #1a1a1a;
        color: #FFD700;
        border: 2px solid #FFD700;
        border-radius: 10px;
        width: 100%;
        height: 50px;
        font-weight: bold;
        transition: 0.3s;
        text-transform: uppercase;
    }
    div.stButton > button:hover {
        background-color: #FFD700;
        color: #000000;
        box-shadow: 0 0 15px #FFD700;
    }
    div.stButton > button:active {
        transform: scale(0.95);
        box-shadow: 0 0 5px #FFD700;
    }
</style>
""", unsafe_allow_html=True)

# --- CONEXÃO E CARREGAMENTO ---
conn = st.connection("gsheets", type=GSheetsConnection)

def get_data():
    # Carrega todas as abas
    try:
        c = conn.read(worksheet="Colaboradores")
        t = conn.read(worksheet="Treinamentos")
        f = conn.read(worksheet="Funções")
        r = conn.read(worksheet="Registros")
        return c, t, f, r
    except:
        return pd.DataFrame(), pd.DataFrame(), pd.DataFrame(), pd.DataFrame()

df_colab, df_treina, df_func, df_reg = get_data()

# --- LÓGICA DE STATUS DE TREINAMENTO ---
def checar_status(data_exec, periodicidade_meses):
    if pd.isna(data_exec): return "NECESSÁRIO FORMAÇÃO", "purple"
    
    hoje = datetime.now()
    execucao = pd.to_datetime(data_exec)
    vencimento = execucao + pd.DateOffset(months=periodicidade_meses)
    dias_para_vencer = (vencimento - hoje).days
    
    # Lógica de Vencimento Crítico (01/04 a 01/11 do ano seguinte)
    ano_vencimento = vencimento.year
    inicio_critico = datetime(ano_vencimento, 4, 1)
    fim_critico = datetime(ano_vencimento, 11, 1)
    
    if vencimento < hoje:
        return "TREINAMENTO VENCIDO", "red"
    elif inicio_critico <= vencimento <= fim_critico:
        return "VENCIMENTO CRÍTICO", "orange"
    elif dias_para_vencer <= 30:
        return "TREINAMENTO A VENCER", "yellow"
    else:
        return "TREINAMENTO CONFORME", "green"

# --- SIDEBAR MENU ---
with st.sidebar:
    st.image("https://www.raizen.com.br/themes/custom/raizen/logo.svg", width=150)
    st.markdown("<h2 style='color: #FFD700; text-align: center;'>MATRIX PRO</h2>", unsafe_allow_html=True)
    
    menu = {
        "🏠 HOME": "Home",
        "📋 MATRIZ": "Matriz",
        "👥 COLABORADORES": "Colaboradores",
        "⚙️ FUNÇÕES": "Funções",
        "✍️ LANÇAR": "Lançar",
        "📚 TREINAMENTOS": "Treinamentos"
    }
    
    # Criando botões manuais para o efeito visual solicitado
    if 'page' not in st.session_state: st.session_state.page = "Home"
    
    for label, target in menu.items():
        if st.button(label):
            st.session_state.page = target

# --- PÁGINAS ---
current_page = st.session_state.page

if current_page == "Home":
    st.title("📊 Dashboard de Gestão")
    
    # Exemplo de Dashboard
    c1, c2 = st.columns(2)
    with c1:
        st.subheader("⚠️ Vencimentos Críticos")
        # Aqui filtraria o df_reg usando a função checar_status
        st.info("Lista de colaboradores em período crítico (Abril - Novembro)")
        
    with c2:
        st.subheader("📈 Status por Função")
        # Gráfico Plotly aqui
        fig = px.bar(df_colab, x="Função", color="Status", barmart="group")
        st.plotly_chart(fig, use_container_width=True)

elif current_page == "Matriz":
    st.title("📋 Matriz de Treinamentos")
    # Lógica de Pivot Table para montar a matriz cruzando registros e obrigatoriedade
    st.warning("Renderizando Matriz Alfabética...")
    # df_pivot = df_colab.merge(df_reg, on="CS").pivot(...)
    # Aplicar cores conforme as regras (Roxo para Necessário Formação, etc)

elif current_page == "Lançar":
    st.title("✍️ Lançamento em Lote")
    with st.form("lote"):
        colaboradores = st.multiselect("Selecione os nomes", df_colab["Nome"].tolist())
        treino = st.selectbox("Treinamento realizado", df_treina["Nome"].tolist())
        data = st.date_input("Data de execução")
        if st.form_submit_button("Salvar na Planilha"):
            st.success("Dados enviados ao Google Sheets!")
